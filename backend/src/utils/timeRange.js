import ApiError from "./apiError.js";

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

  let openMinutes = 9 * 60; // default 9:00 AM
  let closeMinutes = 21 * 60; // default 9:00 PM
  let isClosed = false;

  if (salon.operatingHours && salon.operatingHours.length > 0) {
    const dayConfig = salon.operatingHours.find((h) => h.dayOfWeek === dayOfWeek);
    if (dayConfig) {
      if (dayConfig.isClosed) isClosed = true;
      if (dayConfig.openTime) {
        const [h, m] = dayConfig.openTime.split(":").map(Number);
        openMinutes = h * 60 + m;
      }
      if (dayConfig.closeTime) {
        const [h, m] = dayConfig.closeTime.split(":").map(Number);
        closeMinutes = h * 60 + m;
      }
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
