import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Booking } from "../models/booking.models.js";
import { Salon } from "../models/salon.models.js";
import { Notification } from "../models/notification.models.js";
import { sendBookingConfirmationEmail } from "../utils/mailer.js";

const createBooking = asyncHandler(async (req, res) => {
    const { salonId, services, staff, date, time, totalAmount, serviceNames, staffName } = req.body;

    if (!salonId || !date || !time) {
        throw new ApiError(400, "Salon, date, and time are required");
    }

    const salon = await Salon.findById(salonId);
    if (!salon) {
        throw new ApiError(404, "Salon not found");
    }

    // --- CHECK CAPACITY BEFORE BOOKING ---
    // Match the hour of the requested time (e.g., "10:30 AM" matches "10")
    const requestedHourMatch = time.match(/(^|\D)(\d+)(?=:)/);
    const requestedHour = requestedHourMatch ? requestedHourMatch[0].trim() : "";
    const ampmMatch = time.match(/AM|PM/i);
    const ampm = ampmMatch ? ampmMatch[0].toUpperCase() : "";

    // Regex to match anything in the same hour block
    const timeMatcher = new RegExp(`(^${requestedHour}:|^0${requestedHour}:).*${ampm}`, "i");

    const existingBookingsCount = await Booking.countDocuments({
        salon: salonId,
        date: date,
        status: { $in: ["pending", "confirmed"] },
        time: { $regex: timeMatcher }
    });

    const totalSeats = salon.totalSeats || 6;
    if (existingBookingsCount >= totalSeats) {
        throw new ApiError(400, "This salon is fully booked for the requested time slot. Please try another time.");
    }

    const booking = await Booking.create({
        customer: req.user._id,
        salon: salonId,
        services: services || [],
        serviceNames: serviceNames || [],
        staff: staff || null,
        date,
        time,
        totalAmount: totalAmount || 0,
        status: "pending"
    });

    // Notify customer that the request was received (Not confirmed yet)
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

    // Create notification for salon owner
    await Notification.create({
        recipient: salon.owner,
        sender: req.user._id,
        title: "New Booking Request",
        message: `You have a new appointment request from ${req.user.fullName} for ${date} at ${time}.`,
        type: "booking_request",
        bookingId: booking._id
    });

    return res.status(201).json(
        new ApiResponse(201, booking, "Booking request sent to salon. Please wait for confirmation.")
    );
});

const getUserBookings = asyncHandler(async (req, res) => {
    const bookings = await Booking.find({ customer: req.user._id })
        .populate("salon", "name city address images")
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

    const booking = await Booking.findById(bookingId).populate("salon");
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

    await Notification.create({
        recipient: booking.customer,
        sender: req.user._id,
        title,
        message: `Your booking at ${salon.name} for ${booking.date} has been ${status}.`,
        type,
        bookingId: booking._id
    });

    return res.status(200).json(
        new ApiResponse(200, booking, `Booking status updated to ${status}`)
    );
});

const getAvailability = asyncHandler(async (req, res) => {
    const { salonId } = req.params;
    const { date } = req.query;

    if (!salonId || !date) {
        throw new ApiError(400, "Salon ID and date are required");
    }

    const salon = await Salon.findById(salonId);
    if (!salon) {
        throw new ApiError(404, "Salon not found");
    }

    // Fetch all confirmed/pending bookings for this salon on this date
    const bookings = await Booking.find({
        salon: salonId,
        date: date,
        status: { $in: ["pending", "confirmed"] }
    });

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
            totalSeats: salon.totalSeats || 6
        }, "Availability fetched successfully")
    );
});

export { 
    createBooking, 
    getUserBookings, 
    getSalonBookings, 
    updateBookingStatus,
    getAvailability
};
