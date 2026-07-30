import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Booking } from "../models/booking.models.js";
import { Salon } from "../models/salon.models.js";
import { Notification } from "../models/notification.models.js";
import { sendBookingConfirmationEmail, sendBookingStatusEmail, sendBookingPendingEmail } from "../utils/mailer.js";
import { emitToUser, emitToAll } from "../socket.js";


const createBooking = asyncHandler(async (req, res) => {
    const { salonId, services, staff, date, time, totalAmount, serviceNames, staffName } = req.body;
    const idempotencyKey = req.headers["idempotency-key"] || req.body.idempotencyKey || `legacy-${req.user._id}-${Date.now()}`;

    if (!salonId || !date || !time) {
        throw new ApiError(400, "Salon, date, and time are required");
    }

    // Step 1: Create 10-minute hold
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

    // Step 2: Initiate booking from hold
    const booking = await initiateBookingFromHold({
        holdId: hold._id,
        customerId: req.user._id,
        idempotencyKey,
    });

    const salon = await Salon.findById(salonId);

    // Send confirmation notifications
    if (salon) {
        const bookingTime = `${date} at ${time}`;
        sendBookingConfirmationEmail(
            req.user.email,
            req.user.fullName,
            salon.name,
            bookingTime,
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

const getUserBookings = asyncHandler(async (req, res) => {
    const bookings = await Booking.find({ customer: req.user._id })
        .populate({
            path: "salon",
            select: "name city address images owner",
            populate: {
                path: "owner",
                select: "fullName phonenumber"
            }
        })
        .populate("staff", "name")
        .sort({ createdAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, bookings, "Bookings fetched successfully")
    );
});

const getSalonBookings = asyncHandler(async (req, res) => {
    // 1. Find all salons owned by this user
    const salons = await Salon.find({ owner: req.user._id });
    const salonIds = salons.map(s => s._id);

    // 2. Fetch bookings for those salons
    const bookings = await Booking.find({ salon: { $in: salonIds } })
        .populate("customer", "fullName email phonenumber")
        .populate("salon", "name")
        .populate("staff", "name")
        .sort({ createdAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, bookings, "Salon bookings fetched successfully")
    );
});

const updateBookingStatus = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;
    const { status } = req.body;

    if (!["pending", "confirmed", "completed", "cancelled", "rejected"].includes(status)) {
        throw new ApiError(400, "Invalid status upgrade");
    }

    const booking = await Booking.findById(bookingId).populate("salon").populate("customer", "fullName email");
    if (!booking) {
        throw new ApiError(404, "Booking not found");
    }

    // Security check: Only the salon owner can update this
    const salon = await Salon.findById(booking.salon._id);
    if (salon.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You do not have permission to manage this booking");
    }

    booking.status = status;
    await booking.save();

    // Create notification for customer
    let title = "Booking Update";
    let type = "system";
    if (status === "confirmed") {
        title = "Booking Confirmed!";
        type = "booking_confirmed";
    } else if (status === "rejected") {
        title = "Booking Declined";
        type = "booking_rejected";
    } else if (status === "completed") {
        title = "Appointment Completed";
        type = "booking_completed";
    }

    const notification = await Notification.create({
        recipient: booking.customer,
        sender: req.user._id,
        title,
        message: `Your booking at ${salon.name} for ${booking.date} has been ${status}.`,
        type,
        bookingId: booking._id
    });

    // Trigger booking status email
    sendBookingStatusEmail(
        booking.customer.email,
        booking.customer.fullName,
        booking.salon.name,
        booking.date,
        booking.time,
        status.charAt(0).toUpperCase() + status.slice(1)
    );

    // --- SOCKET.IO EMIT ---
    emitToUser(booking.customer, "newNotification", notification);
    emitToUser(booking.customer, "bookingUpdate", { booking, type: "STATUS_CHANGE" });
    // Also notify owner's other tabs if any
    emitToUser(req.user._id, "bookingUpdate", { booking, type: "STATUS_CHANGE" });


    return res.status(200).json(
        new ApiResponse(200, booking, `Booking status updated to ${status}`)
    );
});

const getAvailability = asyncHandler(async (req, res) => {
    const { salonId } = req.params;
    const { date, staffId } = req.query;

    if (!salonId || !date) {
        throw new ApiError(400, "Salon ID and date are required");
    }

    const salon = await Salon.findById(salonId);
    if (!salon) {
        throw new ApiError(404, "Salon not found");
    }

    let query = {
        salon: salonId,
        date: date,
        status: { $in: ["pending", "confirmed"] }
    };

    if (staffId) {
        query.staff = staffId;
    }

    // Fetch all confirmed/pending bookings for this salon on this date
    const bookings = await Booking.find(query);

    // We'll return an object mapping time slots to their booking counts
    // The frontend can then compare these to salon.totalSeats
    const availability = {};
    bookings.forEach(b => {
        // Extract the hour/AM-PM part to group slots if they aren't exactly identical strings
        const timeKey = b.time; 
        availability[timeKey] = (availability[timeKey] || 0) + 1;
    });

    return res.status(200).json(
        new ApiResponse(200, {
            availability,
            totalSeats: staffId ? 1 : (salon.totalSeats || 6)
        }, "Availability fetched successfully")
    );
});

import { createHold, cancelHold } from "../services/hold.service.js";
import { initiateBookingFromHold, cancelPendingBooking } from "../services/booking.service.js";

const createHoldHandler = asyncHandler(async (req, res) => {
  const { salonId, services, staff, staffName, date, time, totalAmount, serviceNames } = req.body;
  const idempotencyKey = req.headers["idempotency-key"] || req.body.idempotencyKey;

  if (!salonId || !date || !time) {
    throw new ApiError(400, "Salon ID, date, and time are required");
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

export { 
    createBooking, 
    getUserBookings, 
    getSalonBookings, 
    updateBookingStatus,
    getAvailability,
    createHoldHandler,
    initiateBookingHandler,
    cancelPendingBookingHandler
};

