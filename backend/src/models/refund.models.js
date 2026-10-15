import mongoose from "mongoose";

const refundSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    razorpayRefundId: {
      type: String,
      index: true,
      sparse: true,
    },
    amount: {
      type: Number,
      required: true, // in INR rupees
    },
    reason: {
      type: String,
      default: "Customer requested cancellation",
    },
    status: {
      type: String,
      enum: ["pending", "processed", "failed"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

export const Refund = mongoose.model("Refund", refundSchema);
