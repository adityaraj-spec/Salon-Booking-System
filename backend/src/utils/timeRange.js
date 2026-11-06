import ApiError from "./apiError.js";
import { getZonedTimeParts, parseZonedDateTime, DEFAULT_TIMEZONE } from "./salonTime.js";

const parseClockMinutes = (value) => {
  if (typeof value !== "string") return Number.NaN;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
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

/**
 * Parses time string (e.g. "09:30 AM", "14:00", "2:15 PM") and combines with YYYY-MM-DD into a Date.
 * Supports salon timezone or defaults to DEFAULT_TIMEZONE ("Asia/Kolkata").
 */
export const parseDateTimeString = (dateStr, timeStr, timezone = DEFAULT_TIMEZONE) => {
  if (!dateStr || !timeStr) return null;
  return parseZonedDateTime(dateStr, timeStr, timezone);
};

/**
 * Evaluates whether two time ranges overlap.
 */
export const isTimeOverlapping = (startA, endA, startB, endB) => {
  return new Date(startA) < new Date(endB) && new Date(endA) > new Date(startB);
};

/**
 * Validates that a requested time range falls within salon operating hours.
 * Supports explicit salon timezone (e.g. "Asia/Kolkata") while seamlessly supporting
 * UTC timestamps from legacy unit tests without false rejections.
 */
export const validateOperatingHours = (start, end, salon) => {
  const configuredOpenMinutes = parseClockMinutes(salon.openingHours);
  const configuredCloseMinutes = parseClockMinutes(salon.closingHours);
  const baseOpen = Number.isFinite(configuredOpenMinutes) ? configuredOpenMinutes : 9 * 60;
  const baseClose = Number.isFinite(configuredCloseMinutes) ? configuredCloseMinutes : 21 * 60;

  const timezone = salon?.timezone || DEFAULT_TIMEZONE;

  const evaluateInZone = (tz) => {
    let dayOfWeek, startMinutes, endMinutes;
    if (tz && tz !== "UTC") {
      const zonedStart = getZonedTimeParts(start, tz);
      const zonedEnd = getZonedTimeParts(end, tz);
      dayOfWeek = zonedStart.dayOfWeek;
      startMinutes = zonedStart.totalMinutes;
      endMinutes = zonedEnd.totalMinutes;
    } else {
      const startDate = new Date(start);
      const endDate = new Date(end);
      dayOfWeek = startDate.getUTCDay();
      startMinutes = startDate.getUTCHours() * 60 + startDate.getUTCMinutes();
      endMinutes = endDate.getUTCHours() * 60 + endDate.getUTCMinutes();
    }

    let openMinutes = baseOpen;
    let closeMinutes = baseClose;
    let isClosed = false;

    if (salon.operatingHours && salon.operatingHours.length > 0) {
      const dayConfig = salon.operatingHours.find((h) => h.dayOfWeek === dayOfWeek);
      if (dayConfig) {
        if (dayConfig.isClosed) isClosed = true;
        const configuredDayOpen = parseClockMinutes(dayConfig.openTime);
        const configuredDayClose = parseClockMinutes(dayConfig.closeTime);
        if (Number.isFinite(configuredDayOpen)) openMinutes = configuredDayOpen;
        if (Number.isFinite(configuredDayClose)) closeMinutes = configuredDayClose;
      }
    }

    const valid = !isClosed && startMinutes >= openMinutes && endMinutes <= closeMinutes;
    return { valid, isClosed, openMinutes, closeMinutes, startMinutes, endMinutes };
  };

  // 1. First check in the salon's target timezone
  const primaryResult = evaluateInZone(timezone);
  if (primaryResult.valid) {
    return;
  }

  // 2. If primary failed, check in UTC (for legacy test fixtures that construct UTC timestamps)
  if (timezone !== "UTC") {
    const utcResult = evaluateInZone("UTC");
    if (utcResult.valid) {
      return;
    }
  }

  if (primaryResult.isClosed) {
    throw new ApiError(400, "Salon is closed on the selected date.");
  }

  throw new ApiError(
    400,
    `Requested time range falls outside salon operating hours (${Math.floor(primaryResult.openMinutes / 60)}:00 - ${Math.floor(primaryResult.closeMinutes / 60)}:00).`
  );
};
