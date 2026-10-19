import mongoose from "mongoose";

const bookingHoldSchema = new mongoose.Schema(
  {
    salon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Salon",
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
    },
    staffName: String,
    services: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
      },
    ],
    serviceNames: [String],
    snapshotServices: [
      {
        serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
        name: String,
        price: Number,
        durationMin: Number,
      },
    ],
    slotKeys: {
      type: [String],
      default: [],
    },
    date: {
      type: String,
      required: false,
    },
    time: {
      type: String,
      required: false,
    },
    startTime: {
      type: Date,
      index: true,
    },
    endTime: {
      type: Date,
      index: true,
    },
    durationMinutes: {
      type: Number,
      default: 30,
    },
    bufferMinutes: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "expired", "converted", "cancelled"],
      default: "active",
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    idempotencyKey: {
      type: String,
    },
  },
  { timestamps: true }
);

bookingHoldSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
bookingHoldSchema.index({ customer: 1, status: 1, expiresAt: 1 });
bookingHoldSchema.index({ salon: 1, startTime: 1, endTime: 1, status: 1 });
bookingHoldSchema.index({ staff: 1, startTime: 1, endTime: 1, status: 1 });
bookingHoldSchema.index(
  { slotKeys: 1 },
  {
    partialFilterExpression: {
      status: "active",
      "slotKeys.0": { $exists: true },
    },
    name: "hold_slotKeys_active",
  }
);

export const BookingHold = mongoose.model("BookingHold", bookingHoldSchema);

