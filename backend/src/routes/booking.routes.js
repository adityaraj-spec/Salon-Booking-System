import { Router } from "express";
import { 
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
} from "../controllers/booking.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.js";
import {
  createHoldSchema,
  initiateBookingSchema,
  cancelBookingSchema,
} from "../schemas/booking.schema.js";
import {
  createWalkInBookingSchema,
  rescheduleBookingSchema,
} from "../schemas/staffSchedule.schema.js";

const router = Router();

router.route("/hold").post(verifyJWT, validate(createHoldSchema), createHoldHandler);
router.route("/initiate").post(verifyJWT, validate(initiateBookingSchema), initiateBookingHandler);
router.route("/walk-in").post(verifyJWT, validate(createWalkInBookingSchema), createWalkInBookingHandler);
router.route("/:bookingId/reschedule").post(verifyJWT, validate(rescheduleBookingSchema), rescheduleBookingHandler);
router.route("/:bookingId/cancel-pending").post(verifyJWT, validate(cancelBookingSchema), cancelPendingBookingHandler);

router.route("/").post(verifyJWT, createBooking);
router.route("/my-bookings").get(verifyJWT, getUserBookings);
router.route("/salon-bookings").get(verifyJWT, getSalonBookings);
router.route("/availability/:salonId").get(getAvailability);
router.route("/:bookingId/status").patch(verifyJWT, updateBookingStatus);

export default router;
