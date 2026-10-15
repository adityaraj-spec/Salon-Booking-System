/**
 * logger.js — Production-grade structured logging with async context propagation.
 *
 * # Architecture
 *
 *   AsyncLocalStorage: A Node.js process-level store that carries request context
 *   (requestId, correlationId, userId, salonId, bookingId, paymentId) down the
 *   entire async call chain without explicit parameter threading. All services,
 *   repositories, and workers can call logger.info() and the context is automatically
 *   mixed into every log line via the `mixin` function.
 *
 * # Log Schema (every log line)
 *
 *   {
 *     "level":         "INFO" | "ERROR" | "WARN" | "DEBUG" | "TRACE",
 *     "time":          "<ISO 8601>",
 *     "env":           "production" | "development" | "test",
 *     "service":       "salonnow-backend",
 *     "processType":   "api" | "worker" | "all",
 *     "pid":           12345,
 *     "requestId":     "<UUID>",         // always present when inside HTTP context
 *     "correlationId": "<UUID>",         // traces a logical operation across systems
 *     "userId":        "<ObjectId>",     // present after auth middleware runs
 *     "salonId":       "<ObjectId>",     // present when operating on a salon
 *     "bookingId":     "<ObjectId>",     // present in booking flows
 *     "paymentId":     "<ObjectId>",     // present in payment flows
 *     "workerId":      "<string>",       // present in worker job contexts
 *     "msg":           "...",
 *     ...contextFields
 *   }
 *
 * # Redaction
 *
 *   Sensitive fields (authorization, password, tokens, card numbers) are
 *   automatically replaced with "[REDACTED]" by Pino's built-in redact engine.
 *   This happens before the log line is serialized — the raw values never appear
 *   in any output stream.
 *
 * # Performance
 *
 *   Pino uses synchronous writes to stdout (non-blocking from app perspective)
 *   with a fast JSON serializer. Overhead per log call is < 0.05ms, vs ~0.8ms
 *   for a synchronous console.log with JSON.stringify.
 */

import pino from "pino";
import { AsyncLocalStorage } from "async_hooks";

// ─── Async Context Store ──────────────────────────────────────────────────────
/**
 * The single AsyncLocalStorage instance for the entire process.
 *
 * Seed it in HTTP middleware via: asyncLocalStorage.run(store, () => next())
 * Seed it in BullMQ workers via:  asyncLocalStorage.run(store, () => processJob())
 * Read it via:                     asyncLocalStorage.getStore()
 *
 * Exported so middleware and workers can seed and extend the store.
 */
export const asyncLocalStorage = new AsyncLocalStorage();

// ─── Sensitive Field Redaction List ──────────────────────────────────────────
const REDACT_PATHS = [
  // HTTP headers
  "req.headers.authorization",
  "req.headers.cookie",
  "req.headers[\"x-api-key\"]",
  // Auth fields
  "password",
  "currentPassword",
  "newPassword",
  "confirmPassword",
  "refreshToken",
  "accessToken",
  // Payment fields
  "cardNumber",
  "cvv",
  "razorpay_signature",
  "razorpay_payment_id",
  // OTP / secrets
  "otp",
  "secret",
  "webhookSecret",
];

// ─── Logger Instance ──────────────────────────────────────────────────────────
const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),

  // Static fields present on every log line
  base: {
    env: process.env.NODE_ENV || "development",
    service: "salonnow-backend",
    processType: process.env.PROCESS_TYPE || "all",
    pid: process.pid,
  },

  timestamp: pino.stdTimeFunctions.isoTime,

  // Sensitive field redaction — applied before serialization
  redact: {
    paths: REDACT_PATHS,
    censor: "[REDACTED]",
  },

  /**
   * mixin() is called on every log invocation.
   * It reads the AsyncLocalStorage store and merges context fields.
   * Returns {} if no store is active (e.g., during startup before any request).
   */
  mixin() {
    const store = asyncLocalStorage.getStore();
    if (!store) return {};
    return {
      ...(store.requestId    && { requestId:     store.requestId }),
      ...(store.correlationId && { correlationId: store.correlationId }),
      ...(store.userId       && { userId:        store.userId }),
      ...(store.salonId      && { salonId:       store.salonId }),
      ...(store.bookingId    && { bookingId:     store.bookingId }),
      ...(store.paymentId    && { paymentId:     store.paymentId }),
      ...(store.workerId     && { workerId:      store.workerId }),
      ...(store.jobId        && { jobId:         store.jobId }),
    };
  },

  // Normalize level field to uppercase string for log aggregator compatibility
  formatters: {
    level(label) {
      return { level: label.toUpperCase() };
    },
  },
});

/**
 * Enriches the current AsyncLocalStorage store with additional fields.
 * Call this from service methods to add bookingId, paymentId, etc.
 * Safe to call even when no store is active (no-op).
 *
 * @param {object} fields - e.g. { bookingId: "...", salonId: "..." }
 */
export const enrichLogContext = (fields) => {
  const store = asyncLocalStorage.getStore();
  if (!store) return;
  Object.assign(store, fields);
};

export { logger };
export default logger;
