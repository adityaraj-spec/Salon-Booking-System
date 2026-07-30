import mongoose from "mongoose";

const slotCapacitySchema = new mongoose.Schema(
  {
    salon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Salon",
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
    totalCapacity: {
      type: Number,
      required: true,
      default: 6,
    },
    bookedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    heldCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

slotCapacitySchema.index({ salon: 1, date: 1, time: 1 }, { unique: true });

export const SlotCapacity = mongoose.model("SlotCapacity", slotCapacitySchema);
