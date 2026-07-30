import { SlotCapacity } from "../models/slotCapacity.model.js";
import { StaffSlotLock } from "../models/staffSlotLock.model.js";
import { Salon } from "../models/salon.models.js";
import ApiError from "../utils/apiError.js";

/**
 * Ensures capacity is available and reserves a seat + optional staff lock within a Mongo session.
 */
export const checkAndIncrementHoldCapacity = async ({
  salonId,
  staffId,
  date,
  time,
  holdId,
  session,
}) => {
  // Fetch salon to know default total seats if SlotCapacity doesn't exist yet
  const salon = await Salon.findById(salonId).session(session);
  if (!salon) {
    throw new ApiError(404, "Salon not found");
  }

  const totalCapacity = salon.totalSeats || 6;

  // Find or insert capacity doc using upsert logic or findOneAndUpdate
  let capacityDoc = await SlotCapacity.findOne({
    salon: salonId,
    date,
    time,
  }).session(session);

  if (!capacityDoc) {
    try {
      const created = await SlotCapacity.create(
        [
          {
            salon: salonId,
            date,
            time,
            totalCapacity,
            bookedCount: 0,
            heldCount: 0,
          },
        ],
        { session }
      );
      capacityDoc = created[0];
    } catch (err) {
      // Handle potential race condition on unique index upsert
      if (err.code === 11000) {
        capacityDoc = await SlotCapacity.findOne({
          salon: salonId,
          date,
          time,
        }).session(session);
      } else {
        throw err;
      }
    }
  }

  // Atomic increment check: bookedCount + heldCount < totalCapacity
  const updatedCapacity = await SlotCapacity.findOneAndUpdate(
    {
      _id: capacityDoc._id,
      $expr: {
        $lt: [{ $add: ["$bookedCount", "$heldCount"] }, "$totalCapacity"],
      },
    },
    { $inc: { heldCount: 1 } },
    { new: true, session }
  );

  if (!updatedCapacity) {
    throw new ApiError(409, "Slot capacity limit reached. No seats available for this time slot.");
  }

  // If a specific staff member is selected, attempt to acquire StaffSlotLock
  if (staffId) {
    try {
      await StaffSlotLock.create(
        [
          {
            staff: staffId,
            date,
            time,
            holdId,
          },
        ],
        { session }
      );
    } catch (err) {
      if (err.code === 11000) {
        throw new ApiError(409, "Selected staff member is already booked or reserved for this time slot.");
      }
      throw err;
    }
  }

  return updatedCapacity;
};

/**
 * Releases held capacity and optional staff lock when a hold expires or is cancelled.
 */
export const decrementHoldCapacity = async ({
  salonId,
  staffId,
  date,
  time,
  holdId,
  session,
}) => {
  await SlotCapacity.updateOne(
    {
      salon: salonId,
      date,
      time,
      heldCount: { $gt: 0 },
    },
    { $inc: { heldCount: -1 } },
    { session }
  );

  if (staffId) {
    await StaffSlotLock.deleteOne(
      {
        staff: staffId,
        date,
        time,
        ...(holdId ? { holdId } : {}),
      },
      { session }
    );
  }
};

/**
 * Converts a held slot into a confirmed booked slot (decrements heldCount, increments bookedCount).
 */
export const convertHoldToBookingCapacity = async ({
  salonId,
  date,
  time,
  session,
}) => {
  await SlotCapacity.updateOne(
    {
      salon: salonId,
      date,
      time,
      heldCount: { $gt: 0 },
    },
    {
      $inc: { heldCount: -1, bookedCount: 1 },
    },
    { session }
  );
};

/**
 * Releases booked capacity and optional staff lock when a booking is cancelled.
 */
export const decrementBookingCapacity = async ({
  salonId,
  staffId,
  date,
  time,
  bookingId,
  session,
}) => {
  await SlotCapacity.updateOne(
    {
      salon: salonId,
      date,
      time,
      bookedCount: { $gt: 0 },
    },
    { $inc: { bookedCount: -1 } },
    { session }
  );

  if (staffId) {
    await StaffSlotLock.deleteOne(
      {
        staff: staffId,
        date,
        time,
        ...(bookingId ? { bookingId } : {}),
      },
      { session }
    );
  }
};


