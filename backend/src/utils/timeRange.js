import ApiError from "./apiError.js";

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
 */
export const parseDateTimeString = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;

  let hours = 0;
  let minutes = 0;

  const match12 = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  const match24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);

  if (match12) {
    hours = parseInt(match12[1], 10);
    minutes = parseInt(match12[2], 10);
    const ampm = match12[3].toUpperCase();
    if (ampm === "PM" && hours < 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;
  } else if (match24) {
    hours = parseInt(match24[1], 10);
    minutes = parseInt(match24[2], 10);
  } else {
    throw new ApiError(400, `Invalid time format: "${timeStr}". Use "HH:MM" or "HH:MM AM/PM".`);
  }

  const [year, month, day] = dateStr.split("-").map((num) => parseInt(num, 10));
  const dateObj = new Date(Date.UTC(year, month - 1, day, hours, minutes));
  return dateObj;
};

/**
 * Evaluates whether two time ranges overlap.
 */
export const isTimeOverlapping = (startA, endA, startB, endB) => {
  return new Date(startA) < new Date(endB) && new Date(endA) > new Date(startB);
};

/**
 * Validates that a requested time range falls within salon operating hours.
 */
export const validateOperatingHours = (start, end, salon) => {
  const startDate = new Date(start);
  const endDate = new Date(end);

  const dayOfWeek = startDate.getUTCDay(); // 0 = Sunday
  const startMinutes = startDate.getUTCHours() * 60 + startDate.getUTCMinutes();
  const endMinutes = endDate.getUTCHours() * 60 + endDate.getUTCMinutes();

  const configuredOpenMinutes = parseClockMinutes(salon.openingHours);
  const configuredCloseMinutes = parseClockMinutes(salon.closingHours);
  let openMinutes = Number.isFinite(configuredOpenMinutes) ? configuredOpenMinutes : 9 * 60;
  let closeMinutes = Number.isFinite(configuredCloseMinutes) ? configuredCloseMinutes : 21 * 60;
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

  if (isClosed) {
    throw new ApiError(400, "Salon is closed on the selected date.");
  }

  if (startMinutes < openMinutes || endMinutes > closeMinutes) {
    throw new ApiError(
      400,
      `Requested time range falls outside salon operating hours (${Math.floor(openMinutes / 60)}:00 - ${Math.floor(closeMinutes / 60)}:00).`
    );
  }
};
