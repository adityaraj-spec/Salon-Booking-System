import mongoose from "mongoose";

/**
 * WebhookEvent — first-line deduplication for I8.
 *
 * Every Razorpay webhook is recorded here by its event ID before any
 * processing occurs. The unique index on `razorpayEventId` ensures that a
 * duplicate insert attempt (literal webhook retransmission) throws a
 * duplicate-key error, which is caught and treated as "already seen — 200 OK".
 *
 * This is the *first* line of defense. The second line is
 * `confirmPaymentAndBooking()`'s own `Payment.status === "captured"` check,
 * which catches logically-duplicate events (e.g. both `payment.captured` and
 * a late reconciliation event for the same booking).
 *
 * Kept for 90 days for financial audit and dispute resolution.
 */
const webhookEventSchema = new mongoose.Schema({
  // Razorpay's own globally unique event ID — used as the dedup key.
  razorpayEventId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },

  // The event entity type (e.g. "payment.captured", "order.paid").
  eventType: {
    type: String,
    required: true,
  },

  // Timestamp Razorpay reports for the event.
  razorpayCreatedAt: {
    type: Number, // unix timestamp, as Razorpay sends it
    default: null,
  },

  // The full decoded webhook payload, stored for audit and replay debugging.
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },

  // When this server received and stored the event.
  receivedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },

  // Processing outcome — allows manual inspection of stuck/failed webhooks.
  status: {
    type: String,
    enum: ["received", "processed", "ignored", "error"],
    default: "received",
  },

  // Error details if processing failed (for monitoring).
  errorMessage: {
    type: String,
    default: null,
  },

  // TTL: 90 days from receivedAt — for financial audit compliance.
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    index: { expireAfterSeconds: 0 },
  },
});

export const WebhookEvent = mongoose.model("WebhookEvent", webhookEventSchema);
