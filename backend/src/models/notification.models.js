import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ["booking_request", "booking_confirmed", "booking_rejected", "booking_completed", "system"],
    default: "system"
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking"
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

export const Notification = mongoose.model("Notification", notificationSchema);
