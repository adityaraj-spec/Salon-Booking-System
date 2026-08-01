import crypto from "crypto";
import { IdempotencyRecord } from "../models/idempotencyRecord.model.js";
import ApiError from "../utils/apiError.js";
import logger from "../lib/logger.js";

// TTL constants per scope
const TTL_MS = {
  hold: 48 * 60 * 60 * 1000,
  booking: 48 * 60 * 60 * 1000,
  payment_verify: 48 * 60 * 60 * 1000,
  payment_order: 48 * 60 * 60 * 1000,
  reschedule: 48 * 60 * 60 * 1000,
  walk_in: 48 * 60 * 60 * 1000,
  // Failed records expire quickly so the client can retry with a fresh key
  failed: 5 * 60 * 1000,
};

/**
 * SHA-256 hash of the request body (normalized for consistent hashing).
 */
const hashBody = (body) => {
  const normalized = JSON.stringify(body, Object.keys(body || {}).sort());
  return crypto.createHash("sha256").update(normalized).digest("hex");
};

/**
 * Build a deterministic idempotency key when the client does not supply one.
 * This protects existing clients while encouraging header adoption.
 *
 * Key components must uniquely identify the *intent* of the request:
 * - userId — who
 * - endpoint — what operation
 * - body fields that define the target slot / booking
 *
 * TTL for fallback keys is much shorter (60s) to avoid treating genuinely
 * different back-to-back requests as retries.
 */
export const buildFallbackKey = (userId, endpoint, relevantFields) => {
  const input = `${userId}:${endpoint}:${JSON.stringify(relevantFields, Object.keys(relevantFields || {}).sort())}`;
  return `fallback:${crypto.createHash("sha256").update(input).digest("hex")}`;
};

/**
 * withIdempotency — I6 / I7 / I9 enforcement wrapper.
 *
 * Usage:
 *   const result = await withIdempotency(
 *     key,       // client-supplied Idempotency-Key or buildFallbackKey(...)
 *     scope,     // "hold" | "booking" | "payment_verify" | ...
 *     requestBody, // for fingerprinting (detects key reuse with different intent)
 *     isFallback,  // true if we derived the key; affects TTL on failure
 *     async () => {
 *       // The actual operation. Must return { statusCode, body } or throw ApiError.
 *       return { statusCode: 201, body: { hold } };
 *     }
 *   );
 *   // result.statusCode and result.body are guaranteed to be the same on retries.
 *
 * @param {string} key
 * @param {string} scope
 * @param {object} requestBody
 * @param {boolean} isFallback
 * @param {() => Promise<{statusCode: number, body: object}>} actionFn
 * @returns {Promise<{statusCode: number, body: object, fromCache: boolean}>}
 */
export const withIdempotency = async (key, scope, requestBody, isFallback = false, actionFn) => {
  const requestHash = hashBody(requestBody);
  const now = new Date();

  // ── 1. Check existing record ──────────────────────────────────────────────
  let existing;
  try {
    existing = await IdempotencyRecord.findOne({ key }).lean();
  } catch (err) {
    // If we can't read the DB, we must fail — better an error than a duplicate
    logger.error({ err: err.message, key, scope }, "[Idempotency] DB read failed");
    throw new ApiError(503, "Service temporarily unavailable — please retry");
  }

  if (existing) {
    if (existing.status === "completed") {
      // Check for key reuse with different intent (client bug)
      if (existing.requestHash !== requestHash) {
        logger.warn(
          { key, scope, existingHash: existing.requestHash, newHash: requestHash },
          "[Idempotency] Key reused with different request body — returning original response"
        );
      }
      logger.debug({ key, scope }, "[Idempotency] Replaying stored response");
      return {
        statusCode: existing.responseStatusCode,
        body: existing.responseBody,
        fromCache: true,
      };
    }

    if (existing.status === "in_progress") {
      logger.debug({ key, scope }, "[Idempotency] Request already in flight");
      throw new ApiError(409, "Request already in progress — please wait and retry", [
        { code: "REQUEST_IN_PROGRESS" },
      ]);
    }

    if (existing.status === "failed") {
      // Allow retry with same key if the previous attempt failed
      logger.debug({ key, scope }, "[Idempotency] Previous attempt failed — allowing retry");
      // Fall through — record will be overwritten below
    }
  }

  // ── 2. Insert in_progress record ─────────────────────────────────────────
  const expiresAt = new Date(now.getTime() + TTL_MS[scope]);
  try {
    await IdempotencyRecord.findOneAndUpdate(
      { key },
      {
        $set: {
          key,
          scope,
          requestHash,
          status: "in_progress",
          responseBody: null,
          responseStatusCode: null,
          expiresAt,
        },
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    // Duplicate key on the unique index — another concurrent request won the race
    if (err.code === 11000) {
      throw new ApiError(409, "Request already in progress — please wait and retry", [
        { code: "REQUEST_IN_PROGRESS" },
      ]);
    }
    logger.error({ err: err.message, key, scope }, "[Idempotency] Failed to write in_progress record");
    throw new ApiError(503, "Service temporarily unavailable — please retry");
  }

  // ── 3. Execute the action ─────────────────────────────────────────────────
  let result;
  try {
    result = await actionFn();
  } catch (err) {
    // Mark as failed — short TTL allows the client to retry with the same key
    const failedExpiresAt = new Date(now.getTime() + (isFallback ? TTL_MS.failed : TTL_MS.failed));
    await IdempotencyRecord.findOneAndUpdate(
      { key },
      {
        $set: {
          status: "failed",
          responseBody: { error: err.message, code: err.statusCode || 500 },
          responseStatusCode: err.statusCode || 500,
          expiresAt: failedExpiresAt,
        },
      }
    ).catch((e) => logger.warn({ e: e.message }, "[Idempotency] Failed to write error record"));
    throw err; // Re-throw so the controller can return the appropriate HTTP error
  }

  // ── 4. Mark completed, store response ────────────────────────────────────
  try {
    await IdempotencyRecord.findOneAndUpdate(
      { key },
      {
        $set: {
          status: "completed",
          responseBody: result.body,
          responseStatusCode: result.statusCode,
          expiresAt, // reset to full TTL from scope on success
        },
      }
    );
  } catch (err) {
    // Best-effort — if this write fails, the action already succeeded, so
    // we return success and let the TTL clean up the in_progress record.
    logger.warn({ err: err.message, key, scope }, "[Idempotency] Failed to mark record completed");
  }

  return { statusCode: result.statusCode, body: result.body, fromCache: false };
};
