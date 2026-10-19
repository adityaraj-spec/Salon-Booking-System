import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    customer: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: false 
    },
    guestName: String,
    guestPhone: String,
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
    snapshotServices: [
      {
        serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
        name: String,
        price: Number,
        durationMin: Number,
      },
    ],
    totalAmount: Number,
    amounts: {
      subtotal: { type: Number, default: 0 },
      convenienceFee: { type: Number, default: 0 },
      pointsDiscount: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    date: String,
    time: String,
    startTime: {
      type: Date,
      index: true
    },
    endTime: {
      type: Date,
      index: true
    },
    durationMinutes: {
      type: Number,
      default: 30
    },
    bufferMinutes: {
      type: Number,
      default: 0
    },
    holdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BookingHold"
    },
    cancellationPolicySnapshot: {
      type: String,
    },
    holdExpiresAt: {
      type: Date,
    },
    slotKeys: {
      type: [String],
      default: [],
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "pending", "paid", "refunded", "failed"],
      default: "unpaid"
    },
    idempotencyKey: {
      type: String
    },
    source: {
      type: String,
      enum: ["online", "walk_in", "phone"],
      default: "online"
    },
    rescheduledFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking"
    },
    status: {
      type: String,
      enum: ["pending", "pending_payment", "confirmed", "completed", "cancelled", "rejected", "no_show", "expired"],
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
bookingSchema.index({ salon: 1, startTime: 1, endTime: 1, status: 1 });
bookingSchema.index({ staff: 1, startTime: 1, endTime: 1, status: 1 });

// Slot-level uniqueness: ensures no two active bookings share the same slotKey
bookingSchema.index(
  { slotKeys: 1 },
  {
    partialFilterExpression: {
      status: { $in: ["pending_payment", "confirmed"] },
    },
    name: "slotKeys_active_unique",
  }
);

export const Booking = mongoose.model("Booking", bookingSchema);
