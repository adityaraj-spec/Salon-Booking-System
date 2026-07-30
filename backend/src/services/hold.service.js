import mongoose from "mongoose";
import { BookingHold } from "../models/bookingHold.model.js";
import { checkAndIncrementHoldCapacity, decrementHoldCapacity } from "./capacity.service.js";
import { scheduleHoldExpiry } from "../queues/holdExpiry.queue.js";
import { withTransactionRetry } from "../utils/transaction.js";
import ApiError from "../utils/apiError.js";

export const HOLD_DURATION_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Creates a 10-minute hold on a salon slot with transaction retries.
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
  totalAmount,
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

  const expiresAt = new Date(Date.now() + HOLD_DURATION_MS);
  const holdId = new mongoose.Types.ObjectId();

  const holdDoc = await withTransactionRetry(async (session) => {
    // 1. Check and reserve capacity + staff lock
    await checkAndIncrementHoldCapacity({
      salonId,
      staffId,
      date,
      time,
      holdId,
      session,
    });

    // 2. Insert hold record
    const [createdHold] = await BookingHold.create(
      [
        {
          _id: holdId,
          salon: salonId,
          customer: customerId,
          staff: staffId || undefined,
          staffName,
          services,
          serviceNames,
          date,
          time,
          totalAmount,
          status: "active",
          expiresAt,
          idempotencyKey,
        },
      ],
      { session }
    );

    return createdHold;
  });

  // 3. Schedule automated expiry background job in BullMQ
  await scheduleHoldExpiry(holdDoc._id.toString(), HOLD_DURATION_MS);

  return holdDoc;
};

/**
 * Cancels an active hold explicitly.
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

    await decrementHoldCapacity({
      salonId: hold.salon,
      staffId: hold.staff,
      date: hold.date,
      time: hold.time,
      holdId: hold._id,
      session,
    });

    return hold;
  });
};

/**
 * System expiry of a hold.
 */
export const expireHold = async (holdId) => {
  return await withTransactionRetry(async (session) => {
    const hold = await BookingHold.findById(holdId).session(session);
    if (!hold || hold.status !== "active") {
      return null;
    }

    hold.status = "expired";
    await hold.save({ session });

    await decrementHoldCapacity({
      salonId: hold.salon,
      staffId: hold.staff,
      date: hold.date,
      time: hold.time,
      holdId: hold._id,
      session,
    });

    console.log(`Hold ${holdId} expired successfully and slot capacity was released.`);
    return hold;
  });
};
