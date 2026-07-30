import { Booking } from "../models/booking.models.js";
import { BookingHold } from "../models/bookingHold.model.js";
import { StaffSlotLock } from "../models/staffSlotLock.model.js";
import ApiError from "../utils/apiError.js";

const ACTIVE_BOOKING_STATUSES = ["pending", "pending_payment", "confirmed"];

/**
 * Counts overlapping active bookings and holds for a salon in a given time range.
 */
export const countOverlappingOccupancy = async ({ salonId, startTime, endTime, session = null }) => {
  const now = new Date();

  const bookingQuery = Booking.countDocuments({
    salon: salonId,
    status: { $in: ACTIVE_BOOKING_STATUSES },
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  });
  if (session) bookingQuery.session(session);

  const holdQuery = BookingHold.countDocuments({
    salon: salonId,
    status: "active",
    expiresAt: { $gt: now },
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  });
  if (session) holdQuery.session(session);

  const [overlappingBookingsCount, overlappingHoldsCount] = await Promise.all([
    bookingQuery,
    holdQuery,
  ]);

  return overlappingBookingsCount + overlappingHoldsCount;
};

/**
 * Verifies that a specific staff member is free during the requested time range.
 */
export const verifyStaffTimeRangeAvailability = async ({ staffId, startTime, endTime, session = null }) => {
  if (!staffId) return;

  const now = new Date();

  // 1. Check overlapping active bookings
  const bookingQuery = Booking.findOne({
    staff: staffId,
    status: { $in: ACTIVE_BOOKING_STATUSES },
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  });
  if (session) bookingQuery.session(session);

  // 2. Check overlapping active holds
  const holdQuery = BookingHold.findOne({
    staff: staffId,
    status: "active",
    expiresAt: { $gt: now },
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  });
  if (session) holdQuery.session(session);

  const [existingBooking, existingHold] = await Promise.all([bookingQuery, holdQuery]);

  if (existingBooking || existingHold) {
    throw new ApiError(409, "Selected staff member is already booked or reserved during this time range.");
  }
};

/**
 * Validates capacity and staff availability for a time range within a transaction.
 */
export const checkTimeRangeAvailability = async ({ salonId, staffId, startTime, endTime, totalSeats, session = null }) => {
  // 1. Check staff availability if staffId is specified
  if (staffId) {
    await verifyStaffTimeRangeAvailability({ staffId, startTime, endTime, session });
  }

  // 2. Check salon seat capacity
  const currentOccupancy = await countOverlappingOccupancy({ salonId, startTime, endTime, session });

  if (currentOccupancy >= totalSeats) {
    throw new ApiError(409, "Salon seat capacity limit reached for this time range.");
  }

  return { available: true, currentOccupancy, totalSeats };
};
