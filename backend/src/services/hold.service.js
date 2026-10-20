import mongoose from "mongoose";
import { BookingHold } from "../models/bookingHold.model.js";

import { calculateServicesDurationAndPrice } from "./duration.service.js";
import { checkTimeRangeAvailability, getSalonCapacity } from "./availability.service.js";
import { parseDateTimeString, validateOperatingHours } from "../utils/timeRange.js";
import { scheduleHoldExpiry } from "../queues/holdExpiry.queue.js";
import { withTransactionRetry } from "../utils/transaction.js";
import { buildSlotLockKeys, acquireSlotLock, releaseSlotLock } from "../lib/redisLock.js";
import { writeOutboxEvent } from "./outbox.service.js";
import { withIdempotency, buildFallbackKey } from "./idempotency.service.js";
import ApiError from "../utils/apiError.js";
import logger from "../lib/logger.js";

export const HOLD_DURATION_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Creates a 10-minute hold on a salon time range.
 *
 * Correctness guarantees:
 *  - I1: Redis slot lock (acquireSlotLock) ensures at most one concurrent writer per slot bucket.
 *  - I2: countOverlappingOccupancy inside the transaction is the belt-and-suspenders re-check.
 *  - I5/I10: OutboxEvent written inside the same transaction — survives post-commit crashes.
 *  - I6/I9: withIdempotency wraps the entire flow — retries replay the stored response.
 */
export const createHold = async ({
  salonId,
  customerId,
  staffId,
  staffName,
  services,
  serviceNames,
  snapshotServices: inputSnapshotServices,
  date,
  time,
  startTime: inputStartTime,
  totalAmount: inputTotalAmount,
  idempotencyKey: clientIdempotencyKey,
}) => {
  // ── 1. Resolve startTime/endTime ──────────────────────────────────────────
  const effectiveServices = (services && services.length > 0)
    ? services
    : (inputSnapshotServices || []).map((s) => s.serviceId || s._id).filter(Boolean);

  if (effectiveServices.length === 0) {
    throw new ApiError(400, "At least one service must be selected.");
  }

  const {
    services: serviceDocs,
    serviceNames: fetchedServiceNames,
    totalAmount: calculatedAmount,
    durationMinutes,
    bufferMinutes,
    totalDurationWithBuffer,
    salon,
  } = await calculateServicesDurationAndPrice(effectiveServices, salonId);

  let startTime;
  if (inputStartTime) {
    startTime = new Date(inputStartTime);
  } else if (date && time) {
    startTime = parseDateTimeString(date, time);
  } else {
    throw new ApiError(400, "Either startTime or date and time are required.");
  }

  if (isNaN(startTime.getTime())) {
    throw new ApiError(400, "Invalid start time provided.");
  }

  const endTime = new Date(startTime.getTime() + totalDurationWithBuffer * 60 * 1000);

  // 2. Validate operating hours (fast check before acquiring the lock)
  validateOperatingHours(startTime, endTime, salon);

  const formattedDate = date || startTime.toISOString().split("T")[0];
  const formattedTime = time || startTime.toISOString().split("T")[1].substring(0, 5);
  const finalTotalAmount = calculatedAmount;
  const finalServiceNames = fetchedServiceNames;

  // ── 3. Build idempotency key ──────────────────────────────────────────────
  const isFallback = !clientIdempotencyKey;
  const idempotencyKey = clientIdempotencyKey
    ? `hold:${clientIdempotencyKey}`
    : buildFallbackKey(customerId.toString(), "createHold", {
        salonId: salonId.toString(),
        staffId: staffId ? staffId.toString() : "any",
        startTime: startTime.toISOString(),
        services: services.map((s) => s.toString()).sort(),
      });

  // ── 4. Wrap in idempotency guard ─────────────────────────────────────────
  const { body } = await withIdempotency(
    idempotencyKey,
    "hold",
    { salonId, staffId, startTime: startTime.toISOString(), services },
    isFallback,
    async () => {
      // ── 5. Acquire distributed slot lock ─────────────────────────────────
      const lockKeys = buildSlotLockKeys(salonId, staffId, startTime, endTime);
      const { acquired, token, keys: acquiredKeys, stopWatchdog } = await acquireSlotLock(lockKeys);

      if (!acquired) {
        throw new ApiError(
          409,
          "This time slot is currently being booked by another customer. Please try a different time or retry in a few seconds.",
          [{ code: "SLOT_LOCKED" }]
        );
      }

      let holdDoc;
      try {
        // ── 6. MongoDB transaction: verify + create hold + outbox ─────────
        const holdId = new mongoose.Types.ObjectId();
        const expiresAt = new Date(Date.now() + HOLD_DURATION_MS);

        holdDoc = await withTransactionRetry(async (session) => {
          // Re-check occupancy inside the transaction (belt-and-suspenders after the lock)
          await checkTimeRangeAvailability({
            salonId,
            staffId,
            startTime,
            endTime,
            totalSeats: getSalonCapacity(salon, staffId),
            session,
          });

          const snapshotServices = (serviceDocs || []).map((service) => ({
            serviceId: service._id,
            name: service.name,
            price: service.price || 0,
            durationMin: service.durationMin || service.duration || 30,
          }));

          // Create the hold
          const [createdHold] = await BookingHold.create(
            [
              {
                _id: holdId,
                salon: salonId,
                customer: customerId,
                staff: staffId || undefined,
                staffName,
                services: effectiveServices,
                serviceNames: finalServiceNames,
                snapshotServices,
                slotKeys: lockKeys,
                date: formattedDate,
                time: formattedTime,
                startTime,
                endTime,
                durationMinutes,
                bufferMinutes,
                totalAmount: finalTotalAmount,
                status: "active",
                expiresAt,
                idempotencyKey: clientIdempotencyKey || idempotencyKey,
              },
            ],
            { session }
          );

          // Write outbox event in the SAME transaction — durable I10 invalidation
          await writeOutboxEvent(session, "hold.created", {
            holdId: createdHold._id.toString(),
            salonId: salonId.toString(),
            staffId: staffId ? staffId.toString() : null,
            customerId: customerId.toString(),
            date: formattedDate,
          });

          return createdHold;
        });
      } finally {
        // Always release the lock and stop watchdog, regardless of transaction outcome
        await releaseSlotLock(acquiredKeys, token, stopWatchdog);
      }

      // ── 7. Schedule expiry background job ────────────────────────────────
      try {
        await scheduleHoldExpiry(holdDoc._id.toString(), HOLD_DURATION_MS);
      } catch (err) {
        // The outbox relay also reconciles orphaned holds — log but don't fail
        logger.warn({ holdId: holdDoc._id, err: err.message }, "[Hold] Failed to schedule expiry job (outbox relay will reconcile)");
      }

      return { statusCode: 201, body: { hold: holdDoc } };
    }
  );

  return body.hold;
};

/**
 * Cancels an active hold explicitly.
 * Writes an outbox event so availability cache is invalidated at-least-once.
 */
export const cancelHold = async (holdId, customerId) => {
  return await withTransactionRetry(async (session) => {
    const hold = await BookingHold.findOneAndUpdate({
      _id: holdId,
      customer: customerId,
      status: "active",
    }, {
      $set: { status: "cancelled" },
    }, {
      returnDocument: "after",
      session,
    });

    if (!hold) {
      throw new ApiError(404, "Active hold not found or unauthorized");
    }

    // Write outbox event for cache invalidation
    await writeOutboxEvent(session, "hold.cancelled", {
      holdId: hold._id.toString(),
      salonId: hold.salon.toString(),
      staffId: hold.staff ? hold.staff.toString() : null,
      customerId: customerId.toString(),
      date: hold.date,
    });

    return hold;
  });
};

/**
 * System expiry of a hold (called by BullMQ worker).
 * The hold-expiry write and its OutboxEvent are in the SAME transaction (I10).
 */
export const expireHold = async (holdId) => {
  return await withTransactionRetry(async (session) => {
    const convertedHold = await BookingHold.findOne({ _id: holdId, status: "converted" }).session(session);
    if (convertedHold) {
      const { Booking } = await import("../models/booking.models.js");
      const pendingBooking = await Booking.findOneAndUpdate(
        { holdId: convertedHold._id, status: "pending_payment" },
        { $set: { status: "expired", paymentStatus: "failed" } },
        { returnDocument: "after", session }
      );
      if (pendingBooking) {
        await writeOutboxEvent(session, "booking.cancelled", {
          bookingId: pendingBooking._id.toString(),
          salonId: pendingBooking.salon.toString(),
          staffId: pendingBooking.staff ? pendingBooking.staff.toString() : null,
          customerId: pendingBooking.customer ? pendingBooking.customer.toString() : null,
          date: pendingBooking.date,
          reason: "hold_expired",
        });
      }
      return convertedHold;
    }

    const hold = await BookingHold.findOneAndUpdate(
      { _id: holdId, status: "active" },
      { $set: { status: "expired" } },
      { returnDocument: "after", session }
    );
    if (!hold) return null;

    // Write outbox event in the same transaction — I10: never lose an invalidation
    await writeOutboxEvent(session, "hold.expired", {
      holdId: hold._id.toString(),
      salonId: hold.salon.toString(),
      staffId: hold.staff ? hold.staff.toString() : null,
      customerId: hold.customer ? hold.customer.toString() : null,
      date: hold.date,
    });

    return hold;
  });
};
