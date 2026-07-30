import { Booking } from "../models/booking.models.js";
import { checkTimeRangeAvailability } from "./availability.service.js";
import { decrementBookingCapacity } from "./capacity.service.js";
import { calculateServicesDurationAndPrice } from "./duration.service.js";
import { validateOperatingHours } from "../utils/timeRange.js";
import { withTransactionRetry } from "../utils/transaction.js";
import ApiError from "../utils/apiError.js";

/**
 * Reschedules an existing booking atomically within a transaction.
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

    // 3. Verify availability for the new time range
    await checkTimeRangeAvailability({
      salonId: booking.salon,
      staffId: booking.staff,
      startTime: start,
      endTime: end,
      totalSeats: salon.totalSeats || 6,
      session,
    });

    // 4. Release capacity from old slot
    await decrementBookingCapacity({
      salonId: booking.salon,
      staffId: booking.staff,
      date: booking.date,
      time: booking.time,
      bookingId: booking._id,
      session,
    });

    // 5. Update booking record with new time range
    const originalBookingId = booking.rescheduledFrom || booking._id;
    booking.rescheduledFrom = originalBookingId;
    booking.startTime = start;
    booking.endTime = end;
    booking.date = start.toISOString().split("T")[0];
    booking.time = start.toISOString().split("T")[1].substring(0, 5);

    await booking.save({ session });

    return booking;
  });
};
