/**
 * Utility functions for handling salon timezone logic and date/time formatting.
 */

export const DEFAULT_TIMEZONE = "Asia/Kolkata";

/**
 * Returns current timestamp formatted according to the salon timezone.
 * @param {string} timezone
 * @returns {Date}
 */
export const getSalonCurrentTime = (timezone = DEFAULT_TIMEZONE) => {
  const now = new Date();
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    return new Date(formatter.format(now));
  } catch (err) {
    return now;
  }
};

/**
 * Formats date string (YYYY-MM-DD) and time string (HH:mm) into a JS Date object.
 * @param {string} dateStr "YYYY-MM-DD"
 * @param {string} timeStr "HH:mm"
 * @returns {Date}
 */
export const parseSlotDateTime = (dateStr, timeStr) => {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hours, minutes));
};
