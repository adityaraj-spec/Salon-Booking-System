import mongoose from "mongoose";

const staffSlotLockSchema = new mongoose.Schema(
  {
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    holdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BookingHold",
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
    },
  },
  { timestamps: true }
);

staffSlotLockSchema.index({ staff: 1, date: 1, time: 1 }, { unique: true });

export const StaffSlotLock = mongoose.model("StaffSlotLock", staffSlotLockSchema);
