import mongoose from "mongoose";
import { Booking } from "../models/booking.models.js";
import { BookingHold } from "../models/bookingHold.model.js";
import { Staff } from "../models/staff.models.js";
import { Salon } from "../models/salon.models.js";
import ApiError from "../utils/apiError.js";
import { cacheGet, cacheSetAvailability, invalidateAvailabilityByIndex } from "../lib/cacheManager.js";
import logger from "../lib/logger.js";

const ACTIVE_BOOKING_STATUSES = ["pending", "pending_payment", "confirmed"];
const AVAILABILITY_CACHE_TTL_SECONDS = 5;

// ─── Helper: parse "HH:MM" to total minutes from midnight ────────────────────
const timeToMinutes = (str) => {
  const [h, m] = str.split(":").map(Number);
  return h * 60 + m;
};

// ─── Core Overlap Query ───────────────────────────────────────────────────────

// In-memory promise coalescing map for in-flight getAvailableSlots requests
const _pendingSlotRequests = new Map();

/**
 * Counts overlapping active bookings and holds for a salon in a given time range.
 * Merges Bookings and BookingHolds query into a single $unionWith aggregation stage.
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
    $or: [
      { status: { $in: ["pending", "confirmed"] } },
      {
        status: "pending_payment",
        $or: [{ holdExpiresAt: { $exists: false } }, { holdExpiresAt: { $gt: now } }],
      },
    ],
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  };
  if (excludeBookingId) {
    bookingFilter._id = { $ne: new mongoose.Types.ObjectId(excludeBookingId.toString()) };
  }

  const holdFilter = {
    salon: salonId,
    status: "active",
    expiresAt: { $gt: now },
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  };

  const bookingCount = await Booking.countDocuments(bookingFilter, options);
  const holdCount = await BookingHold.countDocuments(holdFilter, options);

  return bookingCount + holdCount;
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
    $or: [
      { status: { $in: ["pending", "confirmed"] } },
      {
        status: "pending_payment",
        $or: [{ holdExpiresAt: { $exists: false } }, { holdExpiresAt: { $gt: now } }],
      },
    ],
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  };
  if (excludeBookingId) {
    bookingFilter._id = { $ne: new mongoose.Types.ObjectId(excludeBookingId.toString()) };
  }

  const existingBooking = await Booking.findOne(bookingFilter, null, options).lean();

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
  ).lean();

  if (existingBooking || existingHold) {
    throw new ApiError(409, "Selected staff member is already booked or reserved during this time range.");
  }
};

// ─── Staff Schedule Validation ────────────────────────────────────────────────

/**
 * Validates that a requested time range falls within a staff member's schedule on that day.
 * Checks: exceptions (day off / holiday), working days, working hours, and break times.
 */
export const validateStaffScheduleForTimeRange = async (staffId, startTime, endTime) => {
  if (!staffId) return;

  const staff = await Staff.findById(staffId).select("schedule isActive exceptions name").lean();
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
 * NOTE: The old Salon.updateOne({ $inc: { __v: 0 } }) WiredTiger doc-lock trick
 * has been REMOVED. Slot-level mutual exclusion is now handled by Redis distributed
 * locks (lib/redisLock.js) BEFORE this function is called. The overlap re-check
 * here remains as a belt-and-suspenders second line of defense inside the transaction.
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
 * PERFORMANCE FIX: Instead of issuing one countDocuments per slot (O(N * 2) queries),
 * we now fetch all active bookings and holds for the entire day in two queries,
 * then compute slot availability in memory — O(2 + N * S) where S = avg slots per booking.
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
  const staffKey = staffId ? staffId.toString() : "any";
  const cacheKey = `avail:${salonId}:${staffKey}:${date}:${durationMinutes}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  if (_pendingSlotRequests.has(cacheKey)) {
    return await _pendingSlotRequests.get(cacheKey);
  }

  const fetchSlotsPromise = (async () => {
    const salon = await Salon.findById(salonId).lean();
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
        await cacheSetAvailability(cacheKey, result, salonId, date, AVAILABILITY_CACHE_TTL_SECONDS);
        return result;
      }
      if (dayConfig.openTime) openMinutes = timeToMinutes(dayConfig.openTime);
      if (dayConfig.closeTime) closeMinutes = timeToMinutes(dayConfig.closeTime);
    }
  }

  // 2. If staffId provided, narrow window to staff working hours
  let staffBreaks = [];
  if (staffId) {
    const staff = await Staff.findById(staffId);
    if (!staff || !staff.isActive) {
      const result = { date, slots: [], reason: "Staff member is not available." };
      await cacheSetAvailability(cacheKey, result, salonId, date, AVAILABILITY_CACHE_TTL_SECONDS);
      return result;
    }

    const exception = staff.exceptions.find((ex) => ex.date === date);
    if (exception) {
      const result = { date, slots: [], reason: `Staff unavailable: ${exception.reason || exception.type}` };
      await cacheSetAvailability(cacheKey, result, salonId, date, AVAILABILITY_CACHE_TTL_SECONDS);
      return result;
    }

    const daySchedule = staff.schedule.find((s) => s.dayOfWeek === dayOfWeek);
    if (!daySchedule || !daySchedule.isWorking) {
      const result = { date, slots: [], reason: "Staff does not work on this day." };
      await cacheSetAvailability(cacheKey, result, salonId, date, AVAILABILITY_CACHE_TTL_SECONDS);
      return result;
    }

    const staffStart = timeToMinutes(daySchedule.startTime || "09:00");
    const staffEnd = timeToMinutes(daySchedule.endTime || "18:00");
    openMinutes = Math.max(openMinutes, staffStart);
    closeMinutes = Math.min(closeMinutes, staffEnd);

    if (daySchedule.breakStart && daySchedule.breakEnd) {
      staffBreaks.push({
        start: timeToMinutes(daySchedule.breakStart),
        end: timeToMinutes(daySchedule.breakEnd),
      });
    }
  }

  // 3. Fetch ALL active bookings and holds for the day in TWO queries (not per-slot)
  const dayStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const dayEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));
  const now = new Date();

  const bookingFilter = {
    salon: salonId,
    $or: [
      { status: { $in: ["pending", "confirmed"] } },
      {
        status: "pending_payment",
        $or: [{ holdExpiresAt: { $exists: false } }, { holdExpiresAt: { $gt: now } }],
      },
    ],
    startTime: { $lt: dayEnd },
    endTime: { $gt: dayStart },
  };
  if (staffId) bookingFilter.staff = staffId;

  const holdFilter = {
    salon: salonId,
    status: "active",
    expiresAt: { $gt: now },
    startTime: { $lt: dayEnd },
    endTime: { $gt: dayStart },
  };
  if (staffId) holdFilter.staff = staffId;

  const [activeBookings, activeHolds] = await Promise.all([
    Booking.find(bookingFilter).select("startTime endTime").lean(),
    BookingHold.find(holdFilter).select("startTime endTime").lean(),
  ]);

  const allOccupied = [...activeBookings, ...activeHolds];

  // 4. Generate candidate slots and compute availability in memory
  const slots = [];
  const totalSeats = staffId ? 1 : (salon.totalSeats || 6);

  for (let slotStart = openMinutes; slotStart + durationMinutes <= closeMinutes; slotStart += slotIntervalMinutes) {
    const slotEnd = slotStart + durationMinutes;

    const overlapsBreak = staffBreaks.some((b) => slotStart < b.end && slotEnd > b.start);
    if (overlapsBreak) continue;

    const startDate = new Date(Date.UTC(year, month - 1, day, Math.floor(slotStart / 60), slotStart % 60));
    const endDate = new Date(Date.UTC(year, month - 1, day, Math.floor(slotEnd / 60), slotEnd % 60));

    // In-memory overlap count (no extra DB queries)
    const occupancy = allOccupied.filter(
      (b) => new Date(b.startTime) < endDate && new Date(b.endTime) > startDate
    ).length;

    if (occupancy < totalSeats) {
      slots.push({
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        availableSeats: totalSeats - occupancy,
      });
    }
  }

  const result = { date, slots, totalSeats: salon.totalSeats || 6, durationMinutes };

  // Register key in the availability index for targeted invalidation
  await cacheSetAvailability(cacheKey, result, salonId, date, AVAILABILITY_CACHE_TTL_SECONDS);

  return result;
  })();

  _pendingSlotRequests.set(cacheKey, fetchSlotsPromise);

  try {
    const res = await fetchSlotsPromise;
    return res;
  } finally {
    _pendingSlotRequests.delete(cacheKey);
  }
};

// ─── Invalidation Entrypoint ──────────────────────────────────────────────────

/**
 * Invalidates ALL availability cache keys for the given salon, optional staff, and dates.
 * Called by the outbox relay after booking/hold state changes.
 *
 * @param {object} params
 * @param {string} params.salonId
 * @param {string|null} params.staffId - if null, invalidates all staff + "any" keys for the dates
 * @param {string[]} params.dates - array of "YYYY-MM-DD" strings
 */
export const invalidateAvailability = async ({ salonId, staffId, dates = [] }) => {
  if (!salonId || dates.length === 0) return;

  for (const date of dates) {
    await invalidateAvailabilityByIndex(salonId, date);
    logger.debug({ salonId, staffId, date }, "[Availability] Cache invalidated");
  }
};

/**
 * @deprecated Use invalidateAvailability() instead (outbox-driven).
 * Kept for backward compatibility — direct callers should be migrated.
 */
export const invalidateAvailabilityCache = async (salonId, date) => {
  await invalidateAvailability({ salonId, staffId: null, dates: [date] });
};
