import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    customer: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    salon: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Salon", 
      required: true 
    },
    staff: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Staff" 
    },
    staffName: String,
    services: [
      { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Service" 
      }
    ],
    serviceNames: [String],
    totalAmount: Number,
    date: String,
    time: String,
    holdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BookingHold"
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "pending", "paid", "refunded", "failed"],
      default: "unpaid"
    },
    idempotencyKey: {
      type: String
    },
    status: {
      type: String,
      enum: ["pending", "pending_payment", "confirmed", "completed", "cancelled", "rejected", "no_show"],
      default: "pending"
    }
  },
  { 
    timestamps: true,
    optimisticConcurrency: true
  }
);

bookingSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
bookingSchema.index({ customer: 1, status: 1, date: 1 });
bookingSchema.index({ salon: 1, status: 1, date: 1 });
bookingSchema.index({ staff: 1, date: 1, time: 1 });

export const Booking = mongoose.model("Booking", bookingSchema);

