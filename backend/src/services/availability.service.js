import mongoose from "mongoose";
import { Booking } from "../models/booking.models.js";
import { BookingHold } from "../models/bookingHold.model.js";
import { Staff } from "../models/staff.models.js";
import { Salon } from "../models/salon.models.js";
import ApiError from "../utils/apiError.js";
import { cacheGet, cacheSet, cacheDel } from "../lib/cacheManager.js";

const ACTIVE_BOOKING_STATUSES = ["pending", "pending_payment", "confirmed"];
const AVAILABILITY_CACHE_TTL_SECONDS = 30;

// ─── Helper: parse "HH:MM" to total minutes from midnight ────────────────────
const timeToMinutes = (str) => {
  const [h, m] = str.split(":").map(Number);
  return h * 60 + m;
};

// ─── Core Overlap Query ───────────────────────────────────────────────────────

/**
 * Counts overlapping active bookings and holds for a salon in a given time range.
 * Optionally excludes one booking by ID (used for rescheduling self-conflict prevention).
 */
export const countOverlappingOccupancy = async ({
  salonId,
  startTime,
  endTime,
  excludeBookingId = null,
  session = null,
}) => {
  const now = new Date();
  const options = session ? { session } : {};

  const bookingFilter = {
    salon: salonId,
    status: { $in: ACTIVE_BOOKING_STATUSES },
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  };
  if (excludeBookingId) {
    bookingFilter._id = { $ne: new mongoose.Types.ObjectId(excludeBookingId.toString()) };
  }

  const overlappingBookingsCount = await Booking.countDocuments(bookingFilter, options);

  const overlappingHoldsCount = await BookingHold.countDocuments(
    {
      salon: salonId,
      status: "active",
      expiresAt: { $gt: now },
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    },
    options
  );

  return overlappingBookingsCount + overlappingHoldsCount;
};

// ─── Staff Overlap Detection ──────────────────────────────────────────────────

/**
 * Verifies that a specific staff member is free during the requested time range.
 * Optionally excludes one booking by ID (used for rescheduling).
 */
export const verifyStaffTimeRangeAvailability = async ({
  staffId,
  startTime,
  endTime,
  excludeBookingId = null,
  session = null,
}) => {
  if (!staffId) return;

  const now = new Date();
  const options = session ? { session } : {};

  const bookingFilter = {
    staff: staffId,
    status: { $in: ACTIVE_BOOKING_STATUSES },
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  };
  if (excludeBookingId) {
    bookingFilter._id = { $ne: new mongoose.Types.ObjectId(excludeBookingId.toString()) };
  }

  const existingBooking = await Booking.findOne(bookingFilter, null, options);

  const existingHold = await BookingHold.findOne(
    {
      staff: staffId,
      status: "active",
      expiresAt: { $gt: now },
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    },
    null,
    options
  );

  if (existingBooking || existingHold) {
    throw new ApiError(409, "Selected staff member is already booked or reserved during this time range.");
  }
};

// ─── Staff Schedule Validation ────────────────────────────────────────────────

/**
 * Validates that a requested time range falls within a staff member's schedule on that day.
 * Checks: exceptions (day off / holiday), working days, working hours, and break times.
 * If staff has no schedule configured, passes through (unscheduled staff = always available).
 */
export const validateStaffScheduleForTimeRange = async (staffId, startTime, endTime) => {
  if (!staffId) return;

  const staff = await Staff.findById(staffId);
  if (!staff) throw new ApiError(404, "Staff member not found.");
  if (!staff.isActive) throw new ApiError(409, "Staff member is not currently active.");

  // No schedule configured — treat as always available
  if (!staff.schedule || staff.schedule.length === 0) return;

  const dateStr = new Date(startTime).toISOString().split("T")[0];
  const dayOfWeek = new Date(startTime).getUTCDay();

  // 1. Check exceptions (days off, holidays)
  const exception = staff.exceptions.find((ex) => ex.date === dateStr);
  if (exception) {
    throw new ApiError(
      409,
      `Staff member is unavailable on ${dateStr}: ${exception.reason || exception.type}`
    );
  }

  // 2. Check day schedule
  const daySchedule = staff.schedule.find((s) => s.dayOfWeek === dayOfWeek);
  if (!daySchedule || !daySchedule.isWorking) {
    throw new ApiError(409, "Staff member does not work on the selected day.");
  }

  // 3. Verify requested time falls within staff working hours
  const startMinutes = new Date(startTime).getUTCHours() * 60 + new Date(startTime).getUTCMinutes();
  const endMinutes = new Date(endTime).getUTCHours() * 60 + new Date(endTime).getUTCMinutes();
  const workStart = timeToMinutes(daySchedule.startTime || "09:00");
  const workEnd = timeToMinutes(daySchedule.endTime || "18:00");

  if (startMinutes < workStart || endMinutes > workEnd) {
    throw new ApiError(
      409,
      `Staff member works ${daySchedule.startTime}–${daySchedule.endTime} on this day. ` +
        `Requested time falls outside their working hours.`
    );
  }

  // 4. Check break time overlap
  if (daySchedule.breakStart && daySchedule.breakEnd) {
    const breakStart = timeToMinutes(daySchedule.breakStart);
    const breakEnd = timeToMinutes(daySchedule.breakEnd);
    // Overlap condition: requestedStart < breakEnd AND requestedEnd > breakStart
    if (startMinutes < breakEnd && endMinutes > breakStart) {
      throw new ApiError(
        409,
        `Requested time overlaps with staff break (${daySchedule.breakStart}–${daySchedule.breakEnd}).`
      );
    }
  }
};

// ─── Master Availability Check ────────────────────────────────────────────────

/**
 * Primary entry point: validates both staff schedule and salon seat capacity
 * for a requested time range within a MongoDB transaction.
 *
 * @param {object} params
 * @param {string} params.salonId
 * @param {string|null} params.staffId
 * @param {Date} params.startTime
 * @param {Date} params.endTime
 * @param {number} params.totalSeats
 * @param {string|null} params.excludeBookingId - booking to exclude (rescheduling)
 * @param {object|null} params.session - MongoDB session for transaction
 */
export const checkTimeRangeAvailability = async ({
  salonId,
  staffId,
  startTime,
  endTime,
  totalSeats,
  excludeBookingId = null,
  session = null,
}) => {
  // 0. Acquire WiredTiger write lock on the Salon document during transactions
  // This serializes concurrent booking/hold checks for the same salon, preventing race conditions
  if (session) {
    await Salon.updateOne({ _id: salonId }, { $inc: { __v: 0 } }, { session });
  }

  // 1. Check staff schedule (day off, working hours, breaks)
  if (staffId) {
    await validateStaffScheduleForTimeRange(staffId, startTime, endTime);
  }

  // 2. Check staff time-range overlap (concurrent booking / hold detection)
  if (staffId) {
    await verifyStaffTimeRangeAvailability({ staffId, startTime, endTime, excludeBookingId, session });
  }

  // 3. Check salon seat capacity via overlap count
  const currentOccupancy = await countOverlappingOccupancy({
    salonId,
    startTime,
    endTime,
    excludeBookingId,
    session,
  });

  if (currentOccupancy >= totalSeats) {
    throw new ApiError(409, "Salon seat capacity limit reached for this time range.");
  }

  return { available: true, currentOccupancy, totalSeats };
};

// ─── Available Slot Generator ─────────────────────────────────────────────────

/**
 * Generates available time slots for a salon on a given date.
 * Results are cached in Redis for 30 seconds.
 *
 * Algorithm:
 * 1. Get salon operating hours for the day
 * 2. If staffId provided, intersect with staff working hours and subtract breaks
 * 3. Generate candidate slots at slotIntervalMinutes intervals
 * 4. For each candidate, count overlap occupancy vs totalSeats
 * 5. Return slots where occupancy < totalSeats
 *
 * @param {object} params
 * @param {string} params.salonId
 * @param {string} params.date - "YYYY-MM-DD"
 * @param {string|null} params.staffId
 * @param {number} params.durationMinutes - duration of the desired appointment
 * @param {number} params.slotIntervalMinutes - granularity of slot generation (default: 30)
 */
export const getAvailableSlots = async ({
  salonId,
  date,
  staffId = null,
  durationMinutes = 30,
  slotIntervalMinutes = 30,
}) => {
  const cacheKey = `availability:${salonId}:${date}:${staffId || "any"}:${durationMinutes}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const salon = await Salon.findById(salonId);
  if (!salon) throw new ApiError(404, "Salon not found.");

  const [year, month, day] = date.split("-").map(Number);
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  // 1. Get salon operating hours for this day
  let openMinutes = 9 * 60;   // default 09:00
  let closeMinutes = 21 * 60; // default 21:00

  if (salon.operatingHours && salon.operatingHours.length > 0) {
    const dayConfig = salon.operatingHours.find((h) => h.dayOfWeek === dayOfWeek);
    if (dayConfig) {
      if (dayConfig.isClosed) {
        const result = { date, slots: [], reason: "Salon is closed on this day." };
        await cacheSet(cacheKey, result, AVAILABILITY_CACHE_TTL_SECONDS);
        return result;
      }
      if (dayConfig.openTime) openMinutes = timeToMinutes(dayConfig.openTime);
      if (dayConfig.closeTime) closeMinutes = timeToMinutes(dayConfig.closeTime);
    }
  }

  // 2. If staffId provided, narrow window to staff working hours
  let staffBreaks = []; // array of { breakStart, breakEnd } in minutes
  if (staffId) {
    const staff = await Staff.findById(staffId);
    if (!staff || !staff.isActive) {
      const result = { date, slots: [], reason: "Staff member is not available." };
      await cacheSet(cacheKey, result, AVAILABILITY_CACHE_TTL_SECONDS);
      return result;
    }

    // Check exception
    const exception = staff.exceptions.find((ex) => ex.date === date);
    if (exception) {
      const result = { date, slots: [], reason: `Staff unavailable: ${exception.reason || exception.type}` };
      await cacheSet(cacheKey, result, AVAILABILITY_CACHE_TTL_SECONDS);
      return result;
    }

    // Get day schedule
    const daySchedule = staff.schedule.find((s) => s.dayOfWeek === dayOfWeek);
    if (!daySchedule || !daySchedule.isWorking) {
      const result = { date, slots: [], reason: "Staff does not work on this day." };
      await cacheSet(cacheKey, result, AVAILABILITY_CACHE_TTL_SECONDS);
      return result;
    }

    // Narrow window to staff hours
    const staffStart = timeToMinutes(daySchedule.startTime || "09:00");
    const staffEnd = timeToMinutes(daySchedule.endTime || "18:00");
    openMinutes = Math.max(openMinutes, staffStart);
    closeMinutes = Math.min(closeMinutes, staffEnd);

    // Record break times
    if (daySchedule.breakStart && daySchedule.breakEnd) {
      staffBreaks.push({
        start: timeToMinutes(daySchedule.breakStart),
        end: timeToMinutes(daySchedule.breakEnd),
      });
    }
  }

  // 3. Generate candidate slot start times
  const slots = [];
  for (let slotStart = openMinutes; slotStart + durationMinutes <= closeMinutes; slotStart += slotIntervalMinutes) {
    const slotEnd = slotStart + durationMinutes;

    // Skip if overlaps any staff break
    const overlapsBreak = staffBreaks.some((b) => slotStart < b.end && slotEnd > b.start);
    if (overlapsBreak) continue;

    // Convert to ISO Date objects
    const startDate = new Date(Date.UTC(year, month - 1, day, Math.floor(slotStart / 60), slotStart % 60));
    const endDate = new Date(Date.UTC(year, month - 1, day, Math.floor(slotEnd / 60), slotEnd % 60));

    // 4. Count overlapping occupancy for this slot
    const occupancy = await countOverlappingOccupancy({
      salonId,
      startTime: startDate,
      endTime: endDate,
    });

    const totalSeats = staffId ? 1 : (salon.totalSeats || 6);

    if (occupancy < totalSeats) {
      slots.push({
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        availableSeats: totalSeats - occupancy,
      });
    }
  }

  const result = { date, slots, totalSeats: salon.totalSeats || 6, durationMinutes };
  await cacheSet(cacheKey, result, AVAILABILITY_CACHE_TTL_SECONDS);
  return result;
};

/**
 * Invalidates the availability cache for a salon on a specific date.
 * Call this after hold creation, hold expiry, booking confirmation, or cancellation.
 */
export const invalidateAvailabilityCache = async (salonId, date) => {
  // Use pattern-based deletion via scan (cacheDel handles individual keys)
  // For now we invalidate the general salon cache which covers availability
  await cacheDel(`availability:${salonId}:${date}:any:30`);
};
