import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Booking } from "../models/booking.models.js";
import { BookingHold } from "../models/bookingHold.model.js";
import { Salon } from "../models/salon.models.js";
import { Notification } from "../models/notification.models.js";
import {
    sendBookingConfirmationEmail,
    sendBookingPendingEmail,
    sendBookingUpdateEmail,
    sendAppointmentCancelledEmail,
    sendNewBookingRequestEmail,
    sendOwnerNewBookingEmail,
} from "../utils/mailer.js";
import logger from "../lib/logger.js";
import { emitToUser } from "../socket.js";
import { createHold, cancelHold } from "../services/hold.service.js";
import { initiateBookingFromHold, cancelPendingBooking, cancelBooking } from "../services/booking.service.js";
import { createWalkInBooking } from "../services/walkin.service.js";
import { rescheduleBooking } from "../services/reschedule.service.js";
import { getAvailableSlots } from "../services/availability.service.js";
import { awardBookingCompletionPoints, reversePointsForBooking } from "../services/loyalty.service.js";

// ─── Legacy booking (hold + initiate in one call — kept for backward compat) ──

const createBooking = asyncHandler(async (req, res) => {
    const { salonId, services, staff, date, time, totalAmount, serviceNames, staffName, snapshotServices } = req.body;
    const idempotencyKey = req.headers["idempotency-key"] || req.body.idempotencyKey || `legacy-${req.user._id}-${Date.now()}`;

    if (!salonId || !date || !time) {
        throw new ApiError(400, "Salon, date, and time are required");
    }

    const hold = await createHold({
        salonId,
        customerId: req.user._id,
        staffId: staff || null,
        staffName: staffName || "Any Available",
        services: services || [],
        serviceNames: serviceNames || [],
        snapshotServices: snapshotServices || [],
        date,
        time,
        totalAmount: totalAmount || 0,
        idempotencyKey,
    });

    const booking = await initiateBookingFromHold({
        holdId: hold._id,
        customerId: req.user._id,
        idempotencyKey,
        useLoyaltyPoints: Boolean(req.body.useLoyaltyPoints),
        pointsToRedeem: req.body.pointsToRedeem !== undefined && req.body.pointsToRedeem !== null ? Number(req.body.pointsToRedeem) : null,
    });

    const salon = await Salon.findById(salonId).populate("owner", "fullName email");
    if (salon) {
        sendBookingConfirmationEmail(
            req.user.email?.trim().toLowerCase(),
            req.user.fullName,
            salon.name,
            `${date} at ${time}`,
            booking._id.toString(),
            serviceNames || [],
            booking.totalAmount
        ).catch(err => logger.warn({ err: err?.message }, "[Booking] Failed to send booking confirmation email"));

        const ownerId = salon.owner?._id || salon.owner;
        const ownerEmail = salon.owner?.email;
        const ownerName = salon.owner?.fullName || "Salon Owner";

        if (ownerEmail) {
            sendOwnerNewBookingEmail(
                ownerEmail,
                ownerName,
                req.user.fullName,
                salon.name,
                `${date} at ${time}`,
                serviceNames || [],
                booking._id.toString()
            ).catch(err => logger.warn({ err: err?.message }, "[Booking] Failed to send owner booking notification email"));
        }

        const notification = await Notification.create({
            recipient: ownerId,
            sender: req.user._id,
            title: "New Confirmed Booking",
            message: `New booking from ${req.user.fullName} for ${date} at ${time}.`,
            type: "booking_confirmed",
            bookingId: booking._id
        });

        emitToUser(ownerId, "newNotification", notification);
        emitToUser(ownerId, "bookingUpdate", { booking, type: "NEW_REQUEST" });
    }

    return res.status(201).json(
        new ApiResponse(201, booking, "Your booking has been successfully confirmed!")
    );
});

// ─── User Booking Queries ──────────────────────────────────────────────────────

const getUserBookings = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [bookings, total] = await Promise.all([
        Booking.find({ customer: req.user._id })
            .populate({
                path: "salon",
                select: "name city address images owner",
                populate: { path: "owner", select: "fullName phonenumber" }
            })
            .populate("staff", "name")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        Booking.countDocuments({ customer: req.user._id }),
    ]);

    return res.status(200).json(
        new ApiResponse(200, {
            bookings,
            pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) }
        }, "Bookings fetched successfully")
    );
});

const getSalonBookings = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const salons = await Salon.find({ owner: req.user._id });
    const salonIds = salons.map(s => s._id);

    const query = { salon: { $in: salonIds } };
    if (status) query.status = status;

    const [bookings, total] = await Promise.all([
        Booking.find(query)
            .populate("customer", "fullName email phonenumber")
            .populate("salon", "name")
            .populate("staff", "name")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        Booking.countDocuments(query),
    ]);

    return res.status(200).json(
        new ApiResponse(200, {
            bookings,
            pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) }
        }, "Salon bookings fetched successfully")
    );
});

// ─── Booking Status Management ────────────────────────────────────────────────

const updateBookingStatus = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;
    const { status } = req.body;

    if (!["pending", "confirmed", "completed", "cancelled", "rejected"].includes(status)) {
        throw new ApiError(400, "Invalid booking status");
    }

    const booking = await Booking.findById(bookingId).populate("salon").populate("customer", "fullName email");
    if (!booking) {
        throw new ApiError(404, "Booking not found");
    }

    const salon = await Salon.findById(booking.salon._id);
    const isOwner = salon && salon.owner.toString() === req.user._id.toString();
    const isAdmin = ["admin", "super_admin"].includes(req.user.role?.toString().trim().toLowerCase());

    if (!isOwner && !isAdmin) {
        throw new ApiError(403, "You do not have permission to manage this booking");
    }

    booking.status = status;
    await booking.save();

    if (status === "completed") {
        awardBookingCompletionPoints(booking._id).catch(err => logger.warn({ err: err?.message }, "[Loyalty] Failed to award completion points"));
    } else if (status === "cancelled" || status === "rejected") {
        reversePointsForBooking({ userId: booking.customer?._id || booking.customer, bookingId: booking._id }).catch(err => logger.warn({ err: err?.message }, "[Loyalty] Failed to reverse points"));
    }

    let title = "Booking Update";
    let type = "system";
    if (status === "confirmed") { title = "Booking Confirmed!"; type = "booking_confirmed"; }
    else if (status === "rejected") { title = "Booking Declined"; type = "booking_rejected"; }
    else if (status === "completed") { title = "Appointment Completed"; type = "booking_completed"; }

    const notification = await Notification.create({
        recipient: booking.customer,
        sender: req.user._id,
        title,
        message: `Your booking at ${salon.name} for ${booking.date} has been ${status}.`,
        type,
        bookingId: booking._id
    });

    // Route to the correct email template based on the new booking status
    const customerEmail = booking.customer.email?.trim().toLowerCase();
    const customerName = booking.customer.fullName;
    const salonDisplayName = booking.salon.name;
    const bookingTime = booking.startTime
        ? booking.startTime.toISOString()
        : `${booking.date || ""} at ${booking.time || ""}`;
    const bookingRef = booking._id.toString();

    if (status === "cancelled" || status === "rejected") {
        sendAppointmentCancelledEmail(
            customerEmail, customerName, salonDisplayName, bookingTime, bookingRef,
            "Your appointment has been cancelled by the salon"
        ).catch(err => logger.warn({ err: err?.message }, "[Booking] Failed to send cancellation email"));
    } else if (status === "confirmed") {
        sendBookingConfirmationEmail(
            customerEmail, customerName, salonDisplayName, bookingTime, bookingRef,
            booking.serviceNames || [], booking.totalAmount
        ).catch(err => logger.warn({ err: err?.message }, "[Booking] Failed to send confirmation email"));
    }
    // "completed" — customer was physically present, no outbound email needed

    emitToUser(booking.customer, "newNotification", notification);
    emitToUser(booking.customer, "bookingUpdate", { booking, type: "STATUS_CHANGE" });
    emitToUser(req.user._id, "bookingUpdate", { booking, type: "STATUS_CHANGE" });

    return res.status(200).json(
        new ApiResponse(200, booking, `Booking status updated to ${status}`)
    );
});

// ─── Availability (Gap 2.3: Time-Range Slot Generator) ───────────────────────

const getAvailability = asyncHandler(async (req, res) => {
    const salonId = req.params.salonId || req.params.id;
    const { date, staffId, durationMinutes, durationMin, slotInterval } = req.query;

    if (!salonId || !date) {
        throw new ApiError(400, "Salon ID and date are required");
    }

    const duration = parseInt(durationMin || durationMinutes, 10) || 30;

    const result = await getAvailableSlots({
        salonId,
        date,
        staffId: staffId || null,
        durationMinutes: duration,
        slotIntervalMinutes: parseInt(slotInterval, 10) || 30,
    });

    return res.status(200).json(
        new ApiResponse(200, result, "Available time slots fetched successfully")
    );
});

// ─── Hold Management ──────────────────────────────────────────────────────────

const createHoldHandler = asyncHandler(async (req, res) => {
    const { salonId, services, staff, staffName, date, time, startTime, totalAmount, serviceNames, snapshotServices } = req.body;
    const idempotencyKey = req.headers["idempotency-key"] || req.body.idempotencyKey;

    if (!salonId || (!startTime && (!date || !time))) {
        throw new ApiError(400, "Salon ID and either startTime or date+time are required");
    }

    const hold = await createHold({
        salonId,
        customerId: req.user._id,
        staffId: staff || null,
        staffName: staffName || "Any Available",
        services: services || [],
        serviceNames: serviceNames || [],
        snapshotServices: snapshotServices || [],
        date,
        time,
        startTime,
        totalAmount: totalAmount || 0,
        idempotencyKey,
    });

    return res.status(201).json(new ApiResponse(201, hold, "Slot held successfully for 10 minutes"));
});

const initiateBookingHandler = asyncHandler(async (req, res) => {
    const { holdId, useLoyaltyPoints, pointsToRedeem } = req.body;
    const idempotencyKey = req.headers["idempotency-key"] || req.body.idempotencyKey;

    if (!holdId) {
        throw new ApiError(400, "Hold ID is required to initiate booking");
    }

    const booking = await initiateBookingFromHold({
        holdId,
        customerId: req.user._id,
        idempotencyKey,
        useLoyaltyPoints: Boolean(useLoyaltyPoints),
        pointsToRedeem: pointsToRedeem !== undefined && pointsToRedeem !== null ? Number(pointsToRedeem) : null,
    });

    // ── Fire-and-forget: notify customer + owner after the booking row is committed ──
    Salon.findById(booking.salon)
        .populate("owner", "fullName email")
        .then(async (salon) => {
            if (!salon) return;
            const customerEmail = req.user.email?.trim().toLowerCase();
            const customerName = req.user.fullName;
            const salonName = salon.name;
            const bookingTime = booking.startTime
                ? booking.startTime.toISOString()
                : `${booking.date || ""} at ${booking.time || ""}`;
            const bookingRef = booking._id.toString();
            const serviceNames = booking.serviceNames || [];

            await Promise.allSettled([
                // Customer: booking received, awaiting payment
                sendBookingPendingEmail(customerEmail, customerName, salonName, bookingTime, bookingRef),
                // Owner: new booking request received
                salon.owner?.email
                    ? sendNewBookingRequestEmail(
                        salon.owner.email,
                        salon.owner.fullName || "Salon Owner",
                        customerName, salonName, bookingTime, serviceNames, bookingRef
                    )
                    : Promise.resolve(),
            ]);

            // In-app + socket notification for salon owner
            if (salon.owner?._id) {
                const notification = await Notification.create({
                    recipient: salon.owner._id,
                    sender: req.user._id,
                    title: "New Booking Request",
                    message: `New booking from ${customerName} for ${bookingTime}.`,
                    type: "booking_confirmed",
                    bookingId: booking._id,
                });
                emitToUser(salon.owner._id, "newNotification", notification);
                emitToUser(salon.owner._id, "bookingUpdate", { booking, type: "NEW_REQUEST" });
            }
        })
        .catch(err => logger.warn({ err: err?.message }, "[Booking] Post-initiation notification failed"));

    return res.status(201).json(new ApiResponse(201, booking, "Booking initiated successfully"));
});

const cancelPendingBookingHandler = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;
    const cancelledBooking = await cancelPendingBooking(bookingId, req.user._id);

    // Notify customer — fire-and-forget
    Salon.findById(cancelledBooking.salon).select("name")
        .then(salon => sendAppointmentCancelledEmail(
            req.user.email?.trim().toLowerCase(),
            req.user.fullName,
            salon?.name || "Salon",
            cancelledBooking.startTime
                ? cancelledBooking.startTime.toISOString()
                : `${cancelledBooking.date || ""} at ${cancelledBooking.time || ""}`,
            cancelledBooking._id.toString(),
            "Booking cancelled before payment was completed"
        ).catch(err => logger.warn({ err: err?.message }, "[Booking] Failed to send cancellation email")))
        .catch(err => logger.warn({ err: err?.message }, "[Booking] Salon lookup failed for cancellation email"));

    return res.status(200).json(new ApiResponse(200, cancelledBooking, "Pending booking cancelled successfully"));
});

const cancelBookingHandler = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;
    const { reason } = req.body || {};
    const cancelledBooking = await cancelBooking({
        bookingId,
        customerId: req.user._id,
        reason,
    });

    // Notify customer — fire-and-forget
    Salon.findById(cancelledBooking.salon).select("name")
        .then(salon => sendAppointmentCancelledEmail(
            req.user.email?.trim().toLowerCase(),
            req.user.fullName,
            salon?.name || "Salon",
            cancelledBooking.startTime
                ? cancelledBooking.startTime.toISOString()
                : `${cancelledBooking.date || ""} at ${cancelledBooking.time || ""}`,
            cancelledBooking._id.toString(),
            reason || "Customer requested cancellation"
        ).catch(err => logger.warn({ err: err?.message }, "[Booking] Failed to send cancellation email")))
        .catch(err => logger.warn({ err: err?.message }, "[Booking] Salon lookup failed for cancellation email"));

    return res.status(200).json(new ApiResponse(200, cancelledBooking, "Booking cancelled successfully"));
});

// ─── Walk-In & Reschedule ─────────────────────────────────────────────────────

const createWalkInBookingHandler = asyncHandler(async (req, res) => {
    const { salonId, staffId, staffName, serviceIds, customerName, customerPhone, startTime, source } = req.body;

    const booking = await createWalkInBooking({
        salonId,
        ownerId: req.user._id,
        staffId,
        staffName,
        serviceIds,
        customerName,
        customerPhone,
        startTime,
        source,
    });

    return res.status(201).json(new ApiResponse(201, booking, "Walk-in booking created and confirmed successfully"));
});

const rescheduleBookingHandler = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;
    const { newStartTime } = req.body;

    // Capture the original appointment time before mutation so the email can show both old and new
    const existingBooking = await Booking.findById(bookingId)
        .select("date time startTime salon")
        .populate("salon", "name");
    const oldBookingTime = existingBooking?.startTime
        ? existingBooking.startTime.toISOString()
        : `${existingBooking?.date || ""} at ${existingBooking?.time || ""}`;
    const salonName = existingBooking?.salon?.name || "Salon";

    const rescheduled = await rescheduleBooking({
        bookingId,
        customerId: req.user._id,
        newStartTime,
    });

    // Notify customer of the rescheduled appointment — fire-and-forget
    const newBookingTime = rescheduled.startTime
        ? rescheduled.startTime.toISOString()
        : `${rescheduled.date || ""} at ${rescheduled.time || ""}`;
    sendBookingUpdateEmail(
        req.user.email?.trim().toLowerCase(),
        req.user.fullName,
        salonName,
        oldBookingTime,
        newBookingTime,
        rescheduled._id.toString()
    ).catch(err => logger.warn({ err: err?.message }, "[Booking] Failed to send reschedule notification email"));

    return res.status(200).json(new ApiResponse(200, rescheduled, "Booking rescheduled successfully"));
});

export {
    createBooking,
    getUserBookings,
    getSalonBookings,
    updateBookingStatus,
    getAvailability,
    createHoldHandler,
    initiateBookingHandler,
    cancelPendingBookingHandler,
    cancelBookingHandler,
    createWalkInBookingHandler,
    rescheduleBookingHandler,
};
