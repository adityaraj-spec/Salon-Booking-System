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
 */
export const buildFallbackKey = (userId, endpoint, relevantFields) => {
  const input = `${userId}:${endpoint}:${JSON.stringify(relevantFields, Object.keys(relevantFields || {}).sort())}`;
  return `fallback:${crypto.createHash("sha256").update(input).digest("hex")}`;
};

/**
 * withIdempotency — I6 / I7 / I9 enforcement wrapper.
 *
 * Item 4 Fix: If an idempotency key is reused with a DIFFERENT request body,
 * it immediately throws HTTP 422 (UNPROCESSABLE_ENTITY) and NEVER replays the old response.
 */
export const withIdempotency = async (key, scope, requestBody, isFallback = false, actionFn) => {
  const requestHash = hashBody(requestBody);
  const now = new Date();

  // ── 1. Check existing record ──────────────────────────────────────────────
  let existing;
  try {
    existing = await IdempotencyRecord.findOne({ key }).lean();
  } catch (err) {
    logger.error({ err: err.message, key, scope }, "[Idempotency] DB read failed");
    throw new ApiError(503, "Service temporarily unavailable — please retry");
  }

  if (existing) {
    if (existing.status === "completed") {
      // Item 4 Fix: Reject key reuse with different request payload with HTTP 422
      if (existing.requestHash !== requestHash) {
        logger.warn(
          { key, scope, existingHash: existing.requestHash, newHash: requestHash },
          "[Idempotency] Payload mismatch — rejecting request with HTTP 422"
        );
        throw new ApiError(
          422,
          "Idempotency key reused with a different request payload. Please use a unique Idempotency-Key for distinct operations.",
          [{ code: "IDEMPOTENCY_PAYLOAD_MISMATCH" }]
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
      logger.debug({ key, scope }, "[Idempotency] Previous attempt failed — allowing retry");
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
    const failedExpiresAt = new Date(now.getTime() + TTL_MS.failed);
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
    throw err;
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
          expiresAt,
        },
      }
    );
  } catch (err) {
    logger.warn({ err: err.message, key, scope }, "[Idempotency] Failed to mark record completed");
  }

  return { statusCode: result.statusCode, body: result.body, fromCache: false };
};
