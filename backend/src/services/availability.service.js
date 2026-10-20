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
const DEFAULT_OPEN_MINUTES = 9 * 60;
const DEFAULT_CLOSE_MINUTES = 21 * 60;
const DEFAULT_CAPACITY = 5;

// ─── Helper: parse "HH:MM" to total minutes from midnight ────────────────────
const timeToMinutes = (str) => {
  if (typeof str !== "string") return Number.NaN;

  const match = str.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return Number.NaN;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();

  if (minutes > 59 || hours > (meridiem ? 12 : 23)) return Number.NaN;
  if (meridiem) {
    if (hours === 12) hours = 0;
    if (meridiem === "PM") hours += 12;
  }

  return hours * 60 + minutes;
};

const formatTimeLabel = (minutesFromMidnight) => {
  const hours24 = Math.floor(minutesFromMidnight / 60) % 24;
  const minutes = minutesFromMidnight % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
};

export const getSalonCapacity = (salon, staffId = null) => {
  if (staffId) return 1;

  const staffCounts = [salon?.staff, salon?.staffMembers]
    .filter(Array.isArray)
    .map((staff) => staff.length);
  const staffCount = staffCounts.length > 0 ? Math.max(...staffCounts) : 0;
  const configuredCapacity = [salon?.maxConcurrentStaff, salon?.totalSeats, staffCount]
    .map(Number)
    .find((capacity) => Number.isFinite(capacity) && capacity > 0);

  const normalizedCapacity = Math.floor(configuredCapacity || 0);
  return normalizedCapacity > 0 ? normalizedCapacity : DEFAULT_CAPACITY;
};

const getSalonOperatingWindow = (salon, dayOfWeek) => {
  const configuredOpenMinutes = timeToMinutes(salon?.openingHours);
  const configuredCloseMinutes = timeToMinutes(salon?.closingHours);
  let openMinutes = Number.isFinite(configuredOpenMinutes) ? configuredOpenMinutes : DEFAULT_OPEN_MINUTES;
  let closeMinutes = Number.isFinite(configuredCloseMinutes) ? configuredCloseMinutes : DEFAULT_CLOSE_MINUTES;
  let isClosed = false;

  if (Array.isArray(salon?.operatingHours) && salon.operatingHours.length > 0) {
    const dayConfig = salon.operatingHours.find((hours) => hours.dayOfWeek === dayOfWeek);
    if (dayConfig) {
      isClosed = Boolean(dayConfig.isClosed);
      const configuredDayOpen = timeToMinutes(dayConfig.openTime);
      const configuredDayClose = timeToMinutes(dayConfig.closeTime);
      if (Number.isFinite(configuredDayOpen)) openMinutes = configuredDayOpen;
      if (Number.isFinite(configuredDayClose)) closeMinutes = configuredDayClose;
    }
  }

  return { openMinutes, closeMinutes, isClosed };
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
  const normalizedTotalSeats = Math.floor(Number(totalSeats) || 0);
  const safeTotalSeats = normalizedTotalSeats > 0 ? normalizedTotalSeats : DEFAULT_CAPACITY;

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

  if (currentOccupancy >= safeTotalSeats) {
    throw new ApiError(409, "Salon seat capacity limit reached for this time range.");
  }

  return { available: true, currentOccupancy, totalSeats: safeTotalSeats };
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
  const { openMinutes, closeMinutes, isClosed } = getSalonOperatingWindow(salon, dayOfWeek);
  if (isClosed) {
    const result = { date, slots: [], reason: "Salon is closed on this day." };
    await cacheSetAvailability(cacheKey, result, salonId, date, AVAILABILITY_CACHE_TTL_SECONDS);
    return result;
  }

  // 2. Keep the salon schedule visible even when a selected staff member is unavailable.
  let staffAvailability = null;
  if (staffId) {
    const staff = await Staff.findById(staffId).select("schedule isActive exceptions").lean();
    if (!staff || !staff.isActive) {
      staffAvailability = { available: false, reason: "Staff member is not available." };
    } else {
      const exception = (staff.exceptions || []).find((ex) => ex.date === date);
      const hasCustomSchedule = Array.isArray(staff.schedule) && staff.schedule.length > 0;
      const daySchedule = hasCustomSchedule
        ? staff.schedule.find((schedule) => schedule.dayOfWeek === dayOfWeek)
        : null;

      if (exception) {
        staffAvailability = {
          available: false,
          reason: `Staff unavailable: ${exception.reason || exception.type}`,
        };
      } else if (!hasCustomSchedule) {
        staffAvailability = {
          available: true,
          start: openMinutes,
          end: closeMinutes,
          breaks: [],
        };
      } else if (!daySchedule || !daySchedule.isWorking) {
        staffAvailability = { available: false, reason: "Staff does not work on this day." };
      } else {
        staffAvailability = {
          available: true,
          start: timeToMinutes(daySchedule.startTime || "09:00"),
          end: timeToMinutes(daySchedule.endTime || "18:00"),
          breaks: daySchedule.breakStart && daySchedule.breakEnd
            ? [{
                start: timeToMinutes(daySchedule.breakStart),
                end: timeToMinutes(daySchedule.breakEnd),
              }]
            : [],
        };
      }
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
  const maxCapacity = getSalonCapacity(salon, staffId);
  const intervalMinutes = Number.isFinite(Number(slotIntervalMinutes)) && Number(slotIntervalMinutes) > 0
    ? Math.floor(Number(slotIntervalMinutes))
    : 30;

  for (let slotStart = openMinutes; slotStart + durationMinutes <= closeMinutes; slotStart += intervalMinutes) {
    const slotEnd = slotStart + durationMinutes;

    const staffCanServeSlot = !staffId || (
      staffAvailability?.available === true &&
      slotStart >= staffAvailability.start &&
      slotEnd <= staffAvailability.end &&
      !staffAvailability.breaks.some((b) => slotStart < b.end && slotEnd > b.start)
    );

    const startDate = new Date(Date.UTC(year, month - 1, day, Math.floor(slotStart / 60), slotStart % 60));
    const endDate = new Date(Date.UTC(year, month - 1, day, Math.floor(slotEnd / 60), slotEnd % 60));

    // In-memory overlap count (no extra DB queries)
    const occupancy = staffCanServeSlot
      ? allOccupied.filter(
          (b) => new Date(b.startTime) < endDate && new Date(b.endTime) > startDate
        ).length
      : maxCapacity;
    const seatsLeft = Math.max(0, maxCapacity - occupancy);

    slots.push({
      time: formatTimeLabel(slotStart),
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      available: staffCanServeSlot && seatsLeft > 0,
      seatsLeft,
      maxCapacity,
      availableSeats: seatsLeft,
    });
  }

  const result = {
    date,
    slots,
    maxCapacity,
    totalSeats: maxCapacity,
    durationMinutes,
    reason: staffAvailability?.available === false ? staffAvailability.reason : undefined,
  };

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
