import { Booking } from "../models/booking.models.js";
import { BookingHold } from "../models/bookingHold.model.js";
import { Salon } from "../models/salon.models.js";
import { User } from "../models/user.models.js";
import { LoyaltyLedger } from "../models/loyaltyLedger.model.js";
import { LoyaltyTransaction } from "../models/loyaltyTransaction.models.js";
import { withTransactionRetry } from "../utils/transaction.js";
import { writeOutboxEvent } from "./outbox.service.js";
import { withIdempotency, buildFallbackKey } from "./idempotency.service.js";
import { confirmPaymentAndBooking } from "./payment.service.js";
import { buildSlotLockKeys, acquireSlotLock, releaseSlotLock } from "../lib/redisLock.js";
import { checkTimeRangeAvailability } from "./availability.service.js";
import { calculateServicesDurationAndPrice } from "./duration.service.js";
import { calculateLoyaltyDiscount, reversePointsForBooking } from "./loyalty.service.js";
import ApiError from "../utils/apiError.js";

/**
 * Initiates a booking from an active 10-minute hold.
 */
export const initiateBookingFromHold = async ({
  holdId,
  customerId,
  idempotencyKey: clientIdempotencyKey,
  useLoyaltyPoints = false,
  pointsToRedeem = null,
}) => {
  const isFallback = !clientIdempotencyKey;
  const idempotencyKey = clientIdempotencyKey
    ? `booking_init:${clientIdempotencyKey}`
    : buildFallbackKey(customerId.toString(), "initiateBookingFromHold", { holdId });

  const { body } = await withIdempotency(
    idempotencyKey,
    "booking",
    { holdId, customerId: customerId.toString(), useLoyaltyPoints, pointsToRedeem },
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

        hold.status = "converted";
        await hold.save({ session });

        const salon = await Salon.findById(hold.salon).session(session);
        const slotKeys =
          hold.slotKeys && hold.slotKeys.length > 0
            ? hold.slotKeys
            : buildSlotLockKeys(
                hold.salon.toString(),
                hold.staff ? hold.staff.toString() : null,
                hold.startTime,
                hold.endTime
              );

        const snapshotServices =
          hold.snapshotServices && hold.snapshotServices.length > 0
            ? hold.snapshotServices
            : (hold.services || []).map((s, idx) => ({
                serviceId: s,
                name: hold.serviceNames?.[idx] || "Service",
                price: 0,
                durationMin: 30,
              }));

        const cancellationPolicySnapshot =
          salon?.cancellationPolicy ||
          "Free cancellation up to 24 hours before your appointment. A 20% fee applies thereafter.";

        const subtotal = hold.totalAmount || 0;
        let pointsDiscount = 0;
        let redeemedPoints = 0;
        let finalPayable = subtotal;

        if (useLoyaltyPoints || (pointsToRedeem !== null && pointsToRedeem > 0)) {
          const user = await User.findById(customerId).session(session);
          if (user && (user.loyaltyPoints || 0) > 0) {
            const calculation = calculateLoyaltyDiscount(
              user.loyaltyPoints,
              subtotal,
              pointsToRedeem
            );
            if (calculation.pointsToRedeem > 0) {
              redeemedPoints = calculation.pointsToRedeem;
              pointsDiscount = calculation.discountAmount;
              finalPayable = calculation.finalTotal;

              user.loyaltyPoints -= redeemedPoints;
              await user.save({ session });
            }
          }
        }

        const [createdBooking] = await Booking.create(
          [
            {
              customer: hold.customer,
              salon: hold.salon,
              staff: hold.staff,
              staffName: hold.staffName,
              services: hold.services,
              serviceNames: hold.serviceNames,
              snapshotServices,
              totalAmount: finalPayable,
              amounts: {
                subtotal,
                convenienceFee: 0,
                pointsDiscount,
                total: finalPayable,
              },
              cancellationPolicySnapshot,
              holdExpiresAt: hold.expiresAt,
              slotKeys,
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

        if (redeemedPoints > 0) {
          const userAfter = await User.findById(customerId).session(session);
          const balanceAfter = userAfter?.loyaltyPoints || 0;
          await LoyaltyLedger.create(
            [
              {
                user: customerId,
                bookingId: createdBooking._id,
                type: "redeem",
                points: redeemedPoints,
                balanceAfter,
                description: `Redeemed ${redeemedPoints} loyalty points (₹${pointsDiscount}) for booking #${createdBooking._id}`,
              },
            ],
            { session }
          );
        }

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
 * Reschedules an existing booking to a new time slot and/or staff member.
 *
 * Item 3 Fix: Acquires Redis slot locks for BOTH old and new slot buckets simultaneously
 * to prevent double-booking races during rescheduling.
 */
export const rescheduleBooking = async ({
  bookingId,
  customerId,
  newStartTime: inputNewStartTime,
  newStaffId,
  idempotencyKey: clientIdempotencyKey,
}) => {
  const isFallback = !clientIdempotencyKey;
  const idempotencyKey = clientIdempotencyKey
    ? `reschedule:${clientIdempotencyKey}`
    : buildFallbackKey(customerId.toString(), "rescheduleBooking", { bookingId, inputNewStartTime });

  const { body } = await withIdempotency(
    idempotencyKey,
    "reschedule",
    { bookingId, inputNewStartTime, newStaffId },
    isFallback,
    async () => {
      const existingBooking = await Booking.findOne({ _id: bookingId, customer: customerId });
      if (!existingBooking) {
        throw new ApiError(404, "Booking not found or unauthorized");
      }

      if (["completed", "cancelled", "rejected"].includes(existingBooking.status)) {
        throw new ApiError(400, `Cannot reschedule a booking with status '${existingBooking.status}'`);
      }

      const newStartTime = new Date(inputNewStartTime);
      if (isNaN(newStartTime.getTime())) {
        throw new ApiError(400, "Invalid new start time provided.");
      }

      const durationWithBuffer = (existingBooking.durationMinutes || 30) + (existingBooking.bufferMinutes || 0);
      const newEndTime = new Date(newStartTime.getTime() + durationWithBuffer * 60 * 1000);
      const targetStaffId = newStaffId || existingBooking.staff;

      // ── Build & Acquire Lock Keys for both OLD and NEW slots (Item 3) ─────
      const oldLockKeys = buildSlotLockKeys(
        existingBooking.salon.toString(),
        existingBooking.staff ? existingBooking.staff.toString() : null,
        existingBooking.startTime,
        existingBooking.endTime
      );
      const newLockKeys = buildSlotLockKeys(
        existingBooking.salon.toString(),
        targetStaffId ? targetStaffId.toString() : null,
        newStartTime,
        newEndTime
      );

      // Unique sorted set of all lock buckets involved
      const allLockKeys = [...new Set([...oldLockKeys, ...newLockKeys])].sort();
      const { acquired, token, keys: acquiredKeys, stopWatchdog } = await acquireSlotLock(allLockKeys);

      if (!acquired) {
        throw new ApiError(
          409,
          "Target slot is currently locked by another request. Please try again.",
          [{ code: "SLOT_LOCKED" }]
        );
      }

      let updatedBooking;
      try {
        const salon = await Salon.findById(existingBooking.salon);
        updatedBooking = await withTransactionRetry(async (session) => {
          // Re-check target slot availability (excluding this booking ID)
          await checkTimeRangeAvailability({
            salonId: existingBooking.salon,
            staffId: targetStaffId,
            startTime: newStartTime,
            endTime: newEndTime,
            totalSeats: salon.totalSeats || 6,
            excludeBookingId: existingBooking._id,
            session,
          });

          const oldDate = existingBooking.date;
          const newDate = newStartTime.toISOString().split("T")[0];
          const newTime = newStartTime.toISOString().split("T")[1].substring(0, 5);

          existingBooking.startTime = newStartTime;
          existingBooking.endTime = newEndTime;
          existingBooking.date = newDate;
          existingBooking.time = newTime;
          if (newStaffId) existingBooking.staff = newStaffId;
          existingBooking.status = "confirmed";

          await existingBooking.save({ session });

          // Write outbox event for durable cache invalidation
          await writeOutboxEvent(session, "booking.rescheduled", {
            bookingId: existingBooking._id.toString(),
            salonId: existingBooking.salon.toString(),
            staffId: targetStaffId ? targetStaffId.toString() : null,
            customerId: customerId.toString(),
            oldDate,
            newDate,
          });

          return existingBooking;
        });
      } finally {
        await releaseSlotLock(acquiredKeys, token, stopWatchdog);
      }

      return { statusCode: 200, body: { booking: updatedBooking } };
    }
  );

  return body.booking;
};

/**
 * Creates an immediate walk-in booking (e.g. by salon owner/staff).
 * Item 3 Fix: Wrapped in acquireSlotLock + withIdempotency + writeOutboxEvent.
 */
export const createWalkInBooking = async ({
  salonId,
  staffId,
  customerId,
  services,
  startTime: inputStartTime,
  idempotencyKey: clientIdempotencyKey,
}) => {
  const isFallback = !clientIdempotencyKey;
  const idempotencyKey = clientIdempotencyKey
    ? `walk_in:${clientIdempotencyKey}`
    : buildFallbackKey(customerId.toString(), "createWalkInBooking", { salonId, startTime: inputStartTime });

  const { body } = await withIdempotency(
    idempotencyKey,
    "walk_in",
    { salonId, staffId, startTime: inputStartTime, services },
    isFallback,
    async () => {
      const {
        services: serviceDocs,
        serviceNames,
        totalAmount,
        durationMinutes,
        bufferMinutes,
        totalDurationWithBuffer,
        salon,
      } = await calculateServicesDurationAndPrice(services, salonId);

      const startTime = new Date(inputStartTime);
      const endTime = new Date(startTime.getTime() + totalDurationWithBuffer * 60 * 1000);

      const lockKeys = buildSlotLockKeys(salonId, staffId, startTime, endTime);
      const { acquired, token, keys: acquiredKeys, stopWatchdog } = await acquireSlotLock(lockKeys);

      if (!acquired) {
        throw new ApiError(409, "Selected time slot is locked by another booking.", [{ code: "SLOT_LOCKED" }]);
      }

      let createdBooking;
      try {
        const formattedDate = startTime.toISOString().split("T")[0];
        const formattedTime = startTime.toISOString().split("T")[1].substring(0, 5);

        createdBooking = await withTransactionRetry(async (session) => {
          await checkTimeRangeAvailability({
            salonId,
            staffId,
            startTime,
            endTime,
            totalSeats: salon.totalSeats || 6,
            session,
          });

          const [doc] = await Booking.create(
            [
              {
                customer: customerId,
                salon: salonId,
                staff: staffId || undefined,
                services,
                serviceNames,
                totalAmount,
                date: formattedDate,
                time: formattedTime,
                startTime,
                endTime,
                durationMinutes,
                bufferMinutes,
                status: "confirmed",
                paymentStatus: "paid",
                idempotencyKey: clientIdempotencyKey || idempotencyKey,
              },
            ],
            { session }
          );

          await writeOutboxEvent(session, "booking.confirmed", {
            bookingId: doc._id.toString(),
            salonId: salonId.toString(),
            staffId: staffId ? staffId.toString() : null,
            customerId: customerId.toString(),
            date: formattedDate,
            source: "walk_in",
          });

          return doc;
        });
      } finally {
        await releaseSlotLock(acquiredKeys, token, stopWatchdog);
      }

      return { statusCode: 201, body: { booking: createdBooking } };
    }
  );

  return body.booking;
};

/**
 * Confirms a booking after successful payment.
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

    await reversePointsForBooking({ userId: customerId, bookingId: booking._id, session });

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

/**
 * Universal cancellation for customer bookings (pending_payment or confirmed).
 * Handles policy-compliant refund execution for confirmed bookings.
 */
export const cancelBooking = async ({ bookingId, customerId, reason }) => {
  const existing = await Booking.findOne({ _id: bookingId, customer: customerId });
  if (!existing) {
    throw new ApiError(404, "Booking not found or unauthorized");
  }

  if (["cancelled", "completed", "rejected"].includes(existing.status)) {
    throw new ApiError(400, `Cannot cancel booking with status '${existing.status}'`);
  }

  if (existing.status === "pending_payment") {
    return await cancelPendingBooking(bookingId, customerId);
  }

  // Confirmed booking: execute policy-compliant refund via initiateRefund
  const { initiateRefund } = await import("./payment.service.js");
  const refundResult = await initiateRefund({ bookingId, customerId, reason });
  await reversePointsForBooking({ userId: customerId, bookingId });
  return refundResult.booking;
};

/**
 * Expires an abandoned pending_payment booking whose hold timer ran out.
 */
export const expirePendingBooking = async (bookingId) => {
  return await withTransactionRetry(async (session) => {
    const booking = await Booking.findById(bookingId).session(session);
    if (!booking || booking.status !== "pending_payment") {
      return null;
    }

    booking.status = "expired";
    booking.paymentStatus = "failed";
    await booking.save({ session });

    await reversePointsForBooking({ userId: booking.customer, bookingId: booking._id, session });

    await writeOutboxEvent(session, "booking.cancelled", {
      bookingId: booking._id.toString(),
      salonId: booking.salon.toString(),
      staffId: booking.staff ? booking.staff.toString() : null,
      customerId: booking.customer ? booking.customer.toString() : null,
      date: booking.date,
      reason: "hold_expired",
    });

    return booking;
  });
};
