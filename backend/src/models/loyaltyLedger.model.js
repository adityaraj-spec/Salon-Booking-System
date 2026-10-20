import mongoose from "mongoose";

const loyaltyLedgerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      index: true,
    },
    type: {
      type: String,
      enum: ["earn", "redeem", "reversal"],
      required: true,
    },
    points: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
    },
  },
  { timestamps: true }
);

loyaltyLedgerSchema.index({ user: 1, createdAt: -1 });

export const LoyaltyLedger = mongoose.model("LoyaltyLedger", loyaltyLedgerSchema);
