import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Booking } from "../models/booking.models.js";
import { Salon } from "../models/salon.models.js";
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

    const booking = await Booking.create({
        customer: req.user._id,
        salon: salonId,
        services: services || [],
        staff: staff || null,
        date,
        time,
        totalAmount: totalAmount || 0,
        status: "confirmed"
    });

    // Trigger booking confirmation email silently with full details
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

    return res.status(201).json(
        new ApiResponse(201, booking, "Booking confirmed successfully")
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

export { createBooking, getUserBookings };
