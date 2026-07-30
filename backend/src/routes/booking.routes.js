import { Router } from "express";
import { 
  createBooking, 
  getUserBookings, 
  getSalonBookings, 
  updateBookingStatus, 
  getAvailability,
  createHoldHandler,
  initiateBookingHandler,
  cancelPendingBookingHandler
} from "../controllers/booking.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.js";
import {
  createHoldSchema,
  initiateBookingSchema,
  cancelBookingSchema,
} from "../schemas/booking.schema.js";

const router = Router();

router.route("/hold").post(verifyJWT, validate(createHoldSchema), createHoldHandler);
router.route("/initiate").post(verifyJWT, validate(initiateBookingSchema), initiateBookingHandler);
router.route("/:bookingId/cancel-pending").post(verifyJWT, validate(cancelBookingSchema), cancelPendingBookingHandler);

router.route("/").post(verifyJWT, createBooking);
router.route("/my-bookings").get(verifyJWT, getUserBookings);
router.route("/salon-bookings").get(verifyJWT, getSalonBookings);
router.route("/availability/:salonId").get(getAvailability);
router.route("/:bookingId/status").patch(verifyJWT, updateBookingStatus);

export default router;
