/**
 * Utility functions for handling salon timezone logic and date/time formatting.
 * Correctly converts between salon local wall-clock time and UTC timestamps.
 */
import ApiError from "./apiError.js";

export const DEFAULT_TIMEZONE = "Asia/Kolkata";

const WEEKDAY_MAP = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/**
 * Breaks a Date or ISO timestamp into its wall-clock components in the given timezone.
 *
 * @param {Date|string|number} dateInput
 * @param {string} [timezone="Asia/Kolkata"]
 * @returns {{
 *   year: number,
 *   month: number,
 *   day: number,
 *   hours: number,
 *   minutes: number,
 *   seconds: number,
 *   totalMinutes: number,
 *   dayOfWeek: number,
 *   dateStr: string,
 *   timeStr: string
 * }}
 */
export const getZonedTimeParts = (dateInput, timezone = DEFAULT_TIMEZONE) => {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, "Invalid date provided for timezone conversion");
  }

  const validTimezone = timezone?.trim() || DEFAULT_TIMEZONE;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: validTimezone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map = {};
  for (const part of parts) {
    map[part.type] = part.value;
  }

  const hours = parseInt(map.hour, 10);
  const minutes = parseInt(map.minute, 10);
  const seconds = parseInt(map.second, 10);
  const dayOfWeek = WEEKDAY_MAP[map.weekday] ?? date.getUTCDay();
  const dateStr = `${map.year}-${map.month}-${map.day}`;
  const pad = (n) => String(n).padStart(2, "0");
  const timeStr = `${pad(hours)}:${pad(minutes)}`;

  return {
    year: parseInt(map.year, 10),
    month: parseInt(map.month, 10),
    day: parseInt(map.day, 10),
    hours,
    minutes,
    seconds,
    totalMinutes: hours * 60 + minutes,
    dayOfWeek,
    dateStr,
    timeStr,
  };
};

/**
 * Parses date string ("YYYY-MM-DD") and time string ("HH:MM" or "HH:MM AM/PM")
 * in the salon's local timezone into a correct UTC JS Date object.
 *
 * @param {string} dateStr "YYYY-MM-DD"
 * @param {string} timeStr "HH:MM" or "HH:MM AM/PM"
 * @param {string} [timezone="Asia/Kolkata"]
 * @returns {Date}
 */
export const parseZonedDateTime = (dateStr, timeStr, timezone = DEFAULT_TIMEZONE) => {
  if (!dateStr || !timeStr) return null;

  const validTimezone = timezone?.trim() || DEFAULT_TIMEZONE;

  const match12 = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  const match24 = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  let hours = 0;
  let minutes = 0;

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

  const [y, m, d] = dateStr.split("-").map(Number);
  let guess = new Date(Date.UTC(y, m - 1, d, hours, minutes));

  // Iteratively adjust for the target timezone offset
  for (let i = 0; i < 3; i++) {
    const zoned = getZonedTimeParts(guess, validTimezone);
    const targetMinutes = hours * 60 + minutes;
    const diffMinutes = targetMinutes - zoned.totalMinutes;
    if (diffMinutes === 0 && zoned.dateStr === dateStr) break;
    guess = new Date(guess.getTime() + diffMinutes * 60 * 1000);
  }

  return guess;
};

/**
 * Backward-compatible alias for parseZonedDateTime.
 */
export const parseSlotDateTime = (dateStr, timeStr, timezone = DEFAULT_TIMEZONE) => {
  return parseZonedDateTime(dateStr, timeStr, timezone);
};

/**
 * Returns the current date in the salon's timezone.
 */
export const getSalonCurrentTime = (timezone = DEFAULT_TIMEZONE) => {
  return new Date();
};
