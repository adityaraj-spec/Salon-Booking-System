import mongoose from "mongoose";

/**
 * OutboxEvent — transactional outbox for I5 / I10.
 *
 * Written inside the SAME MongoDB transaction as the state-changing write.
 * Supports atomic worker claiming (lockedBy, lockedUntil, status) to prevent
 * multi-instance API deployments from double-processing outbox events.
 *
 * Poison events (attempts >= 5) are transitioned to "dead_letter" status
 * so they do not block subsequent events (Audit Finding #5).
 */
const outboxEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      index: true,
      enum: [
        "hold.created",
        "hold.expired",
        "hold.cancelled",
        "booking.initiated",
        "booking.confirmed",
        "booking.cancelled",
        "booking.rescheduled",
        "booking.completed",
        "booking.rejected",
        "staff.schedule_changed",
        "salon.hours_changed",
      ],
    },

    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    // Lifecycle status: pending | processing | processed | dead_letter
    status: {
      type: String,
      enum: ["pending", "processing", "processed", "dead_letter"],
      default: "pending",
      index: true,
    },

    processed: {
      type: Boolean,
      default: false,
      index: true,
    },

    processedAt: {
      type: Date,
      default: null,
    },

    // Multi-instance worker lease claim fields (Item 2)
    lockedBy: {
      type: String,
      default: null,
    },

    lockedUntil: {
      type: Date,
      default: null,
      index: true,
    },

    attempts: {
      type: Number,
      default: 0,
      index: true,
    },

    lastError: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for atomic polling query
outboxEventSchema.index({ status: 1, processed: 1, attempts: 1, lockedUntil: 1, createdAt: 1 });

export const OutboxEvent = mongoose.model("OutboxEvent", outboxEventSchema);
