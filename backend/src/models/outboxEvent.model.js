import mongoose from "mongoose";

/**
 * OutboxEvent — transactional outbox for I5 / I10.
 *
 * Written inside the SAME MongoDB transaction as the state-changing write.
 * This guarantees the cache-invalidation and notification intent is never
 * lost, even if the process crashes after the transaction commits but before
 * the inline invalidation call that exists in the current code.
 *
 * The outboxRelay worker consumes unprocessed events at-least-once and marks
 * them processed — fully decoupled from the HTTP request/response cycle.
 */
const outboxEventSchema = new mongoose.Schema(
  {
    // Event type — used by the relay to dispatch to the right handler.
    type: {
      type: String,
      required: true,
      index: true,
      // Supported event types:
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

    // Free-form payload — contains everything the relay needs to invalidate
    // the right cache keys and emit the right socket events.
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    // Whether the relay has successfully processed this event.
    // Indexed for the relay's polling query: { processed: false }.
    processed: {
      type: Boolean,
      default: false,
      index: true,
    },

    // ISO date of when this event was processed (for debugging / audit).
    processedAt: {
      type: Date,
      default: null,
    },

    // Number of times the relay has attempted to process this event.
    // Enables exponential backoff on stuck events.
    attempts: {
      type: Number,
      default: 0,
    },

    // Error message from the last failed processing attempt (for debugging).
    lastError: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Compound index for efficient relay polling: newest unprocessed events first.
outboxEventSchema.index({ processed: 1, createdAt: 1 });

export const OutboxEvent = mongoose.model("OutboxEvent", outboxEventSchema);
