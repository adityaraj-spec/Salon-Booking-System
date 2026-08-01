import mongoose from "mongoose";

/**
 * IdempotencyRecord — persistence backbone for I6 / I7 / I9.
 *
 * Every mutating request that must be idempotent (hold, booking, payment-verify, reschedule)
 * writes one record here. On retry, the stored responseBody is replayed verbatim without
 * re-executing any handler logic or side effects.
 *
 * TTL index on `expiresAt` cleans up old records automatically.
 */
const idempotencyRecordSchema = new mongoose.Schema({
  // The deduplication key — either the client-supplied Idempotency-Key header
  // or a server-derived sha256 fallback from (userId + endpoint + relevant fields).
  key: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },

  // Logical scope — useful for monitoring and debugging.
  scope: {
    type: String,
    enum: ["hold", "booking", "payment_verify", "payment_order", "reschedule", "walk_in"],
    required: true,
  },

  // SHA-256 of the normalized request body at the time of the first call.
  // If a retry presents the same key but a different hash, we can surface a
  // diagnostic warning (same key, different intent — likely a client bug).
  requestHash: {
    type: String,
    required: true,
  },

  // Lifecycle state machine:
  //   absent → in_progress → completed (response stored)
  //                       → failed     (short TTL, client may retry with fresh key)
  status: {
    type: String,
    enum: ["in_progress", "completed", "failed"],
    default: "in_progress",
    required: true,
  },

  // The HTTP status code to replay on idempotent retry
  responseStatusCode: {
    type: Number,
    default: null,
  },

  // The response body to replay verbatim on idempotent retry
  responseBody: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },

  // Automatic deletion via MongoDB TTL index — no manual sweep needed.
  // hold / booking / payment_verify → 48h TTL
  // failed → much shorter (set by the service to allow fresh retry quickly)
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 },
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const IdempotencyRecord = mongoose.model("IdempotencyRecord", idempotencyRecordSchema);
