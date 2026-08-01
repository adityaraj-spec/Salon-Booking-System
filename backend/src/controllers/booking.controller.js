import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Booking } from "../models/booking.models.js";
import { BookingHold } from "../models/bookingHold.model.js";
import { Salon } from "../models/salon.models.js";
import { Notification } from "../models/notification.models.js";
import { sendBookingConfirmationEmail, sendBookingStatusEmail } from "../utils/mailer.js";
import { emitToUser } from "../socket.js";
import { createHold, cancelHold } from "../services/hold.service.js";
import { initiateBookingFromHold, cancelPendingBooking } from "../services/booking.service.js";
import { createWalkInBooking } from "../services/walkin.service.js";
import { rescheduleBooking } from "../services/reschedule.service.js";
import { getAvailableSlots } from "../services/availability.service.js";

// ─── Legacy booking (hold + initiate in one call — kept for backward compat) ──

const createBooking = asyncHandler(async (req, res) => {
    const { salonId, services, staff, date, time, totalAmount, serviceNames, staffName } = req.body;
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
        date,
        time,
        totalAmount: totalAmount || 0,
        idempotencyKey,
    });

    const booking = await initiateBookingFromHold({
        holdId: hold._id,
        customerId: req.user._id,
        idempotencyKey,
    });

    const salon = await Salon.findById(salonId);
    if (salon) {
        sendBookingConfirmationEmail(
            req.user.email,
            req.user.fullName,
            salon.name,
            `${date} at ${time}`,
            totalAmount || 0,
            staffName || "Any Available",
            serviceNames || []
        );

        const notification = await Notification.create({
            recipient: salon.owner,
            sender: req.user._id,
            title: "New Confirmed Booking",
            message: `New booking from ${req.user.fullName} for ${date} at ${time}.`,
            type: "booking_confirmed",
            bookingId: booking._id
        });

        emitToUser(salon.owner, "newNotification", notification);
        emitToUser(salon.owner, "bookingUpdate", { booking, type: "NEW_REQUEST" });
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
    if (salon.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You do not have permission to manage this booking");
    }

    booking.status = status;
    await booking.save();

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

    sendBookingStatusEmail(
        booking.customer.email,
        booking.customer.fullName,
        booking.salon.name,
        booking.date,
        booking.time,
        status.charAt(0).toUpperCase() + status.slice(1)
    );

    emitToUser(booking.customer, "newNotification", notification);
    emitToUser(booking.customer, "bookingUpdate", { booking, type: "STATUS_CHANGE" });
    emitToUser(req.user._id, "bookingUpdate", { booking, type: "STATUS_CHANGE" });

    return res.status(200).json(
        new ApiResponse(200, booking, `Booking status updated to ${status}`)
    );
});

// ─── Availability (Gap 2.3: Time-Range Slot Generator) ───────────────────────

const getAvailability = asyncHandler(async (req, res) => {
    const { salonId } = req.params;
    const { date, staffId, durationMinutes, slotInterval } = req.query;

    if (!salonId || !date) {
        throw new ApiError(400, "Salon ID and date are required");
    }

    const result = await getAvailableSlots({
        salonId,
        date,
        staffId: staffId || null,
        durationMinutes: parseInt(durationMinutes, 10) || 30,
        slotIntervalMinutes: parseInt(slotInterval, 10) || 30,
    });

    return res.status(200).json(
        new ApiResponse(200, result, "Available time slots fetched successfully")
    );
});

// ─── Hold Management ──────────────────────────────────────────────────────────

const createHoldHandler = asyncHandler(async (req, res) => {
    const { salonId, services, staff, staffName, date, time, startTime, totalAmount, serviceNames } = req.body;
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
        date,
        time,
        startTime,
        totalAmount: totalAmount || 0,
        idempotencyKey,
    });

    return res.status(201).json(new ApiResponse(201, hold, "Slot held successfully for 10 minutes"));
});

const initiateBookingHandler = asyncHandler(async (req, res) => {
    const { holdId } = req.body;
    const idempotencyKey = req.headers["idempotency-key"] || req.body.idempotencyKey;

    if (!holdId) {
        throw new ApiError(400, "Hold ID is required to initiate booking");
    }

    const booking = await initiateBookingFromHold({
        holdId,
        customerId: req.user._id,
        idempotencyKey,
    });

    return res.status(201).json(new ApiResponse(201, booking, "Booking initiated successfully"));
});

const cancelPendingBookingHandler = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;
    const cancelledBooking = await cancelPendingBooking(bookingId, req.user._id);
    return res.status(200).json(new ApiResponse(200, cancelledBooking, "Pending booking cancelled successfully"));
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

    const rescheduled = await rescheduleBooking({
        bookingId,
        customerId: req.user._id,
        newStartTime,
    });

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
    createWalkInBookingHandler,
    rescheduleBookingHandler,
};
