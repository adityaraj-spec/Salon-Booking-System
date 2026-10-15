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
import { authorize, requireOwnership } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import { Booking } from "../models/booking.models.js";
import {
  createHoldSchema,
  initiateBookingSchema,
  cancelBookingSchema,
} from "../schemas/booking.schema.js";
import {
  createWalkInBookingSchema,
  rescheduleBookingSchema,
} from "../schemas/staffSchedule.schema.js";

import { holdRateLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// Hold creation (customers & staff) protected by distributed multi-dimensional holdRateLimiter (Milestone 3)
router.route("/hold").post(verifyJWT, holdRateLimiter, validate(createHoldSchema), createHoldHandler);

// Initiate booking from hold
router.route("/initiate").post(verifyJWT, validate(initiateBookingSchema), initiateBookingHandler);

// Walk-in booking (owners & staff only)
router.route("/walk-in").post(verifyJWT, authorize("owner", "staff", "admin"), validate(createWalkInBookingSchema), createWalkInBookingHandler);

// Reschedule booking (requires ABAC ownership check - Item 3)
router.route("/:bookingId/reschedule").post(
  verifyJWT,
  requireOwnership(Booking, "bookingId", "customer"),
  validate(rescheduleBookingSchema),
  rescheduleBookingHandler
);

// Cancel pending booking (requires ABAC ownership check - Item 3)
router.route("/:bookingId/cancel-pending").post(
  verifyJWT,
  requireOwnership(Booking, "bookingId", "customer"),
  validate(cancelBookingSchema),
  cancelPendingBookingHandler
);

// General bookings
router.route("/").post(verifyJWT, createBooking);
router.route("/my-bookings").get(verifyJWT, getUserBookings);
router.route("/salon-bookings").get(verifyJWT, authorize("owner", "staff", "admin"), getSalonBookings);
router.route("/availability/:salonId").get(getAvailability);

// Update status (requires owner/staff/admin authorization)
router.route("/:bookingId/status").patch(
  verifyJWT,
  authorize("owner", "staff", "admin"),
  updateBookingStatus
);

export default router;
