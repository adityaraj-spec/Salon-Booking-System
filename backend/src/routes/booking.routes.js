import { Router } from "express";
import { createBooking, getUserBookings, getSalonBookings, updateBookingStatus, getAvailability } from "../controllers/booking.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/").post(verifyJWT, createBooking);
router.route("/my-bookings").get(verifyJWT, getUserBookings);
router.route("/salon-bookings").get(verifyJWT, getSalonBookings);
router.route("/availability/:salonId").get(getAvailability);

export default router;
