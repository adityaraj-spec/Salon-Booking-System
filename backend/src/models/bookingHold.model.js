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
    date: {
      type: String,
      required: true,
    },
    time: {
      type: String,
      required: true,
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

export const BookingHold = mongoose.model("BookingHold", bookingHoldSchema);
