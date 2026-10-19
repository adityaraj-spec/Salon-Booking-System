import { Booking } from "../models/booking.models.js";
import { checkTimeRangeAvailability } from "./availability.service.js";
import { calculateServicesDurationAndPrice } from "./duration.service.js";
import { validateOperatingHours } from "../utils/timeRange.js";
import { withTransactionRetry } from "../utils/transaction.js";
import { buildSlotLockKeys } from "../lib/redisLock.js";
import ApiError from "../utils/apiError.js";

/**
 * Reschedules an existing booking atomically within a transaction.
 *
 * With overlap-only capacity: updating booking.startTime/endTime within the SAME
 * transaction means the availability check excludes the booking being rescheduled
 * (because the check runs before the update) — this is the correct atomic behavior.
 * No capacity counter manipulation needed.
 */
export const rescheduleBooking = async ({ bookingId, customerId, newStartTime }) => {
  const start = new Date(newStartTime);
  if (isNaN(start.getTime())) {
    throw new ApiError(400, "Invalid new start time provided.");
  }

  return await withTransactionRetry(async (session) => {
    const booking = await Booking.findOne({ _id: bookingId, customer: customerId }).session(session);
    if (!booking) {
      throw new ApiError(404, "Booking not found or unauthorized");
    }

    if (["cancelled", "rejected", "completed"].includes(booking.status)) {
      throw new ApiError(400, `Cannot reschedule a ${booking.status} booking.`);
    }

    // 1. Calculate duration and total duration with buffer
    const { totalDurationWithBuffer, salon } = await calculateServicesDurationAndPrice(
      booking.services,
      booking.salon,
      session
    );

    const end = new Date(start.getTime() + totalDurationWithBuffer * 60 * 1000);

    // 2. Validate operating hours for new time
    validateOperatingHours(start, end, salon);

    // 3. Verify availability for the new time range.
    //    The current booking's old time range is still in the DB (not yet updated),
    //    but the availability check uses the NEW startTime/endTime — if the old and
    //    new ranges don't overlap, both are counted. To avoid self-conflict, we
    //    temporarily exclude this booking from the overlap count by passing excludeBookingId.
    await checkTimeRangeAvailability({
      salonId: booking.salon,
      staffId: booking.staff,
      startTime: start,
      endTime: end,
      totalSeats: salon.totalSeats || 6,
      excludeBookingId: booking._id,
      session,
    });

    // 4. Update booking record with new time range
    //    With overlap-only capacity: updating startTime/endTime in the booking document
    //    IS the capacity update. No counter manipulation required.
    const originalBookingId = booking.rescheduledFrom || booking._id;
    booking.rescheduledFrom = originalBookingId;
    booking.startTime = start;
    booking.endTime = end;
    booking.date = start.toISOString().split("T")[0];
    booking.time = start.toISOString().split("T")[1].substring(0, 5);
    booking.slotKeys = buildSlotLockKeys(
      booking.salon.toString(),
      booking.staff ? booking.staff.toString() : null,
      start,
      end
    );

    await booking.save({ session });

    return booking;
  });
};
