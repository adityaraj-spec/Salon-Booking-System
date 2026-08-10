import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    salon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Salon",
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    reviewText: String,
    comment: String,
    isVerified: {
      type: Boolean,
      default: true,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

reviewSchema.index({ salon: 1, createdAt: -1 });
reviewSchema.index({ user: 1, createdAt: -1 });

export const Review = mongoose.model("Review", reviewSchema);
