import mongoose from "mongoose";
import { BookingHold } from "../models/bookingHold.model.js";

import { calculateServicesDurationAndPrice } from "./duration.service.js";
import { checkTimeRangeAvailability } from "./availability.service.js";
import { parseDateTimeString, validateOperatingHours } from "../utils/timeRange.js";
import { scheduleHoldExpiry } from "../queues/holdExpiry.queue.js";
import { withTransactionRetry } from "../utils/transaction.js";
import ApiError from "../utils/apiError.js";

export const HOLD_DURATION_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Creates a 10-minute hold on a salon time range with transaction retries.
 * Capacity is now derived entirely from overlap queries — no SlotCapacity counters.
 */
export const createHold = async ({
  salonId,
  customerId,
  staffId,
  staffName,
  services,
  serviceNames,
  date,
  time,
  startTime: inputStartTime,
  totalAmount: inputTotalAmount,
  idempotencyKey,
}) => {
  // Idempotency check: if key already used for an active hold, return existing hold
  if (idempotencyKey) {
    const existingHold = await BookingHold.findOne({
      idempotencyKey,
      customer: customerId,
      status: "active",
      expiresAt: { $gt: new Date() },
    });
    if (existingHold) {
      return existingHold;
    }
  }

  // 1. Calculate duration, total price, and buffer time from selected services & salon
  const {
    services: serviceDocs,
    serviceNames: fetchedServiceNames,
    totalAmount: calculatedAmount,
    durationMinutes,
    bufferMinutes,
    totalDurationWithBuffer,
    salon,
  } = await calculateServicesDurationAndPrice(services, salonId);

  // 2. Compute exact startTime and endTime ISODate objects
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

  // 3. Validate requested time range against salon operating hours
  validateOperatingHours(startTime, endTime, salon);

  const expiresAt = new Date(Date.now() + HOLD_DURATION_MS);
  const holdId = new mongoose.Types.ObjectId();

  const finalTotalAmount = inputTotalAmount || calculatedAmount;
  const finalServiceNames = serviceNames && serviceNames.length > 0 ? serviceNames : fetchedServiceNames;
  const formattedDate = date || startTime.toISOString().split("T")[0];
  const formattedTime = time || startTime.toISOString().split("T")[1].substring(0, 5);

  const holdDoc = await withTransactionRetry(async (session) => {
    // 4. Verify time-range availability via overlap queries (no counter increments)
    await checkTimeRangeAvailability({
      salonId,
      staffId,
      startTime,
      endTime,
      totalSeats: salon.totalSeats || 6,
      session,
    });

    // 5. Insert hold record with time-range fields
    const [createdHold] = await BookingHold.create(
      [
        {
          _id: holdId,
          salon: salonId,
          customer: customerId,
          staff: staffId || undefined,
          staffName,
          services,
          serviceNames: finalServiceNames,
          date: formattedDate,
          time: formattedTime,
          startTime,
          endTime,
          durationMinutes,
          bufferMinutes,
          totalAmount: finalTotalAmount,
          status: "active",
          expiresAt,
          idempotencyKey,
        },
      ],
      { session }
    );

    return createdHold;
  });

  // 6. Schedule automated expiry background job in BullMQ
  await scheduleHoldExpiry(holdDoc._id.toString(), HOLD_DURATION_MS);

  return holdDoc;
};

/**
 * Cancels an active hold explicitly.
 * With overlap-only capacity, cancellation just marks the hold expired — no counter updates needed.
 */
export const cancelHold = async (holdId, customerId) => {
  return await withTransactionRetry(async (session) => {
    const hold = await BookingHold.findOne({
      _id: holdId,
      customer: customerId,
      status: "active",
    }).session(session);

    if (!hold) {
      throw new ApiError(404, "Active hold not found or unauthorized");
    }

    hold.status = "cancelled";
    await hold.save({ session });

    return hold;
  });
};

/**
 * System expiry of a hold (called by BullMQ worker).
 * With overlap-only capacity, just mark as expired — the document exclusion from overlap
 * queries happens automatically because status is no longer "active".
 */
export const expireHold = async (holdId) => {
  return await withTransactionRetry(async (session) => {
    const hold = await BookingHold.findById(holdId).session(session);
    if (!hold || hold.status !== "active") {
      return null;
    }

    hold.status = "expired";
    await hold.save({ session });

    return hold;
  });
};
