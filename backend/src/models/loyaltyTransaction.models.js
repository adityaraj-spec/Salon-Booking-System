import mongoose from "mongoose";

const loyaltyTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
    },
    points: {
      type: Number,
      required: true, // positive for earned, negative for redeemed
    },
    type: {
      type: String,
      enum: ["earned", "redeemed", "referral_bonus"],
      required: true,
    },
    description: String,
  },
  { timestamps: true }
);

loyaltyTransactionSchema.index({ user: 1, createdAt: -1 });

export const LoyaltyTransaction = mongoose.model("LoyaltyTransaction", loyaltyTransactionSchema);
