import { Booking } from "../models/booking.models.js";
import { BookingHold } from "../models/bookingHold.model.js";
import { withTransactionRetry } from "../utils/transaction.js";
import ApiError from "../utils/apiError.js";

/**
 * Initiates a booking from an active 10-minute hold.
 * With overlap-only capacity: the booking document itself is the capacity record.
 * No SlotCapacity counters to increment — just create the booking and mark the hold converted.
 */
export const initiateBookingFromHold = async ({
  holdId,
  customerId,
  idempotencyKey,
}) => {
  // Idempotency check
  if (idempotencyKey) {
    const existingBooking = await Booking.findOne({ idempotencyKey, customer: customerId });
    if (existingBooking) {
      return existingBooking;
    }
  }

  return await withTransactionRetry(async (session) => {
    const hold = await BookingHold.findOne({
      _id: holdId,
      customer: customerId,
      status: "active",
      expiresAt: { $gt: new Date() },
    }).session(session);

    if (!hold) {
      throw new ApiError(400, "Hold has expired, been cancelled, or does not exist.");
    }

    // 1. Mark hold as converted (excludes it from future overlap queries)
    hold.status = "converted";
    await hold.save({ session });

    // 2. Create booking document with pending_payment status
    // The booking document itself is now the capacity record — overlap queries will
    // detect it because status is in ACTIVE_BOOKING_STATUSES ["pending", "pending_payment", "confirmed"]
    const [bookingDoc] = await Booking.create(
      [
        {
          customer: hold.customer,
          salon: hold.salon,
          staff: hold.staff,
          staffName: hold.staffName,
          services: hold.services,
          serviceNames: hold.serviceNames,
          totalAmount: hold.totalAmount,
          date: hold.date,
          time: hold.time,
          startTime: hold.startTime,
          endTime: hold.endTime,
          durationMinutes: hold.durationMinutes,
          bufferMinutes: hold.bufferMinutes,
          holdId: hold._id,
          status: "pending_payment",
          paymentStatus: "pending",
          idempotencyKey,
        },
      ],
      { session }
    );

    return bookingDoc;
  });
};

/**
 * Confirms a booking after successful payment.
 */
export const confirmBookingAfterPayment = async (bookingId) => {
  return await withTransactionRetry(async (session) => {
    const booking = await Booking.findById(bookingId).session(session);
    if (!booking) {
      throw new ApiError(404, "Booking not found");
    }

    booking.status = "confirmed";
    booking.paymentStatus = "paid";
    await booking.save({ session });

    return booking;
  });
};

/**
 * Cancels a pending_payment booking and frees capacity.
 * With overlap-only capacity: setting status to "cancelled" automatically removes it
 * from future overlap query results. No counter decrements needed.
 */
export const cancelPendingBooking = async (bookingId, customerId) => {
  return await withTransactionRetry(async (session) => {
    const booking = await Booking.findOne({
      _id: bookingId,
      customer: customerId,
      status: "pending_payment",
    }).session(session);

    if (!booking) {
      throw new ApiError(404, "Pending booking not found or unauthorized");
    }

    booking.status = "cancelled";
    booking.paymentStatus = "failed";
    await booking.save({ session });

    return booking;
  });
};
