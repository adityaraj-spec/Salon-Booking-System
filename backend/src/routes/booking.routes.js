import { Router } from "express";
import { createBooking, getUserBookings, getSalonBookings, updateBookingStatus } from "../controllers/booking.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/").post(verifyJWT, createBooking);
router.route("/my-bookings").get(verifyJWT, getUserBookings);
router.route("/salon-bookings").get(verifyJWT, getSalonBookings);
router.route("/:bookingId/status").patch(verifyJWT, updateBookingStatus);

export default router;
