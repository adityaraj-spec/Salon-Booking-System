import { Booking } from "../models/booking.models.js";
import { BookingHold } from "../models/bookingHold.model.js";
import { withTransactionRetry } from "../utils/transaction.js";
import { writeOutboxEvent } from "./outbox.service.js";
import { withIdempotency, buildFallbackKey } from "./idempotency.service.js";
import { confirmPaymentAndBooking } from "./payment.service.js";
import ApiError from "../utils/apiError.js";

/**
 * Initiates a booking from an active 10-minute hold.
 *
 * Guarantees:
 * - I6/I9: Wrapped in withIdempotency()
 * - I5/I10: Writes an OutboxEvent inside the same transaction
 */
export const initiateBookingFromHold = async ({
  holdId,
  customerId,
  idempotencyKey: clientIdempotencyKey,
}) => {
  const isFallback = !clientIdempotencyKey;
  const idempotencyKey = clientIdempotencyKey
    ? `booking_init:${clientIdempotencyKey}`
    : buildFallbackKey(customerId.toString(), "initiateBookingFromHold", { holdId });

  const { body } = await withIdempotency(
    idempotencyKey,
    "booking",
    { holdId, customerId: customerId.toString() },
    isFallback,
    async () => {
      const bookingDoc = await withTransactionRetry(async (session) => {
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
        const [createdBooking] = await Booking.create(
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
              idempotencyKey: clientIdempotencyKey || idempotencyKey,
            },
          ],
          { session }
        );

        // 3. Write outbox event in same transaction
        await writeOutboxEvent(session, "booking.initiated", {
          bookingId: createdBooking._id.toString(),
          salonId: createdBooking.salon.toString(),
          staffId: createdBooking.staff ? createdBooking.staff.toString() : null,
          customerId: customerId.toString(),
          date: createdBooking.date,
        });

        return createdBooking;
      });

      return { statusCode: 201, body: { booking: bookingDoc } };
    }
  );

  return body.booking;
};

/**
 * Confirms a booking after successful payment.
 * Delegates to the unified idempotent payment confirmation function.
 */
export const confirmBookingAfterPayment = async (bookingId, razorpayOrderId, razorpayPaymentId) => {
  const result = await confirmPaymentAndBooking({
    bookingId,
    razorpayOrderId,
    razorpayPaymentId,
    source: "client",
  });
  return result.booking;
};

/**
 * Cancels a pending_payment booking and frees capacity.
 * Writes an outbox event so cache invalidation is guaranteed.
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

    await writeOutboxEvent(session, "booking.cancelled", {
      bookingId: booking._id.toString(),
      salonId: booking.salon.toString(),
      staffId: booking.staff ? booking.staff.toString() : null,
      customerId: customerId.toString(),
      date: booking.date,
    });

    return booking;
  });
};
