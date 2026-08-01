import crypto from "crypto";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import {
  createRazorpayOrder,
  verifyPaymentAndConfirmBooking,
  processRazorpayWebhook,
  initiateRefund,
} from "../services/payment.service.js";
import { WebhookEvent } from "../models/webhookEvent.model.js";
import logger from "../lib/logger.js";

export const createOrderHandler = asyncHandler(async (req, res) => {
  const { bookingId } = req.body;

  if (!bookingId) {
    throw new ApiError(400, "Booking ID is required");
  }

  const orderData = await createRazorpayOrder({
    bookingId,
    customerId: req.user._id,
  });

  return res.status(201).json(
    new ApiResponse(201, orderData, "Razorpay payment order created successfully")
  );
});

export const verifyPaymentHandler = asyncHandler(async (req, res) => {
  const { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  const result = await verifyPaymentAndConfirmBooking({
    bookingId,
    customerId: req.user._id,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  });

  return res.status(200).json(
    new ApiResponse(200, result, "Payment verified and booking confirmed successfully")
  );
});

/**
 * Webhook handler — raw-body HMAC verification + first-line WebhookEvent deduplication.
 *
 * This function receives `req.body` as a raw Buffer because the webhook route
 * uses express.raw() (not express.json()). This is essential for correct HMAC
 * verification — Razorpay signs the raw bytes, not re-serialized JSON.
 *
 * Flow:
 *  1. Extract raw body buffer (guaranteed by express.raw() on this route)
 *  2. HMAC-SHA256 verify against Razorpay webhook secret using timing-safe compare
 *  3. Parse JSON from the verified raw buffer
 *  4. Extract razorpayEventId and attempt WebhookEvent.create — unique index dedup (I8)
 *  5. Delegate to processRazorpayWebhook() which calls the shared confirmPaymentAndBooking()
 */
export const webhookHandler = asyncHandler(async (req, res) => {
  // req.body is a Buffer from express.raw() — NOT a parsed object
  const rawBody = req.body;
  const signatureHeader = req.headers["x-razorpay-signature"];

  if (!Buffer.isBuffer(rawBody) || rawBody.length === 0) {
    logger.warn("[Webhook] Received non-buffer body — middleware order may be misconfigured");
    throw new ApiError(400, "Webhook body must be raw bytes");
  }

  // ── Step 1: HMAC-SHA256 verification on raw bytes ────────────────────────
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (webhookSecret) {
    if (!signatureHeader) {
      logger.warn("[Webhook] Missing x-razorpay-signature header");
      throw new ApiError(400, "Missing webhook signature");
    }

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody) // raw Buffer — never re-serialized
      .digest("hex");

    // Timing-safe comparison to prevent timing oracle attacks
    const sigBuffer = Buffer.from(signatureHeader, "utf8");
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");

    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      logger.warn({ signatureHeader }, "[Webhook] HMAC signature verification failed — possible forged request");
      throw new ApiError(400, "Invalid webhook signature");
    }
  } else if (process.env.NODE_ENV === "production") {
    // In production, webhook secret is required
    logger.error("[Webhook] RAZORPAY_WEBHOOK_SECRET is not set in production — rejecting all webhooks");
    throw new ApiError(500, "Webhook secret not configured");
  }

  // ── Step 2: Parse JSON from the verified buffer ──────────────────────────
  let eventPayload;
  try {
    eventPayload = JSON.parse(rawBody.toString("utf8"));
  } catch (err) {
    logger.warn({ err: err.message }, "[Webhook] Failed to parse webhook JSON body");
    throw new ApiError(400, "Invalid webhook JSON payload");
  }

  const razorpayEventId = eventPayload.id;
  const eventType = eventPayload.event;

  if (!razorpayEventId) {
    logger.warn({ eventPayload }, "[Webhook] Webhook payload missing event ID");
    // Return 200 to prevent Razorpay from retrying a malformed payload
    return res.status(200).json(new ApiResponse(200, { status: "ignored" }, "Missing event ID"));
  }

  // ── Step 3: WebhookEvent deduplication (I8 — first line of defense) ─────
  try {
    await WebhookEvent.create({
      razorpayEventId,
      eventType,
      razorpayCreatedAt: eventPayload.created_at,
      payload: eventPayload,
      status: "received",
    });
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key — this event was already received and processed
      logger.info({ razorpayEventId, eventType }, "[Webhook] Duplicate event — already processed (I8)");
      return res.status(200).json(new ApiResponse(200, { status: "duplicate" }, "Event already processed"));
    }
    // Non-dedup error — log and continue (processing is more important than the audit record)
    logger.warn({ err: err.message, razorpayEventId }, "[Webhook] Failed to insert WebhookEvent record");
  }

  // ── Step 4: Process the event (delegates to shared confirmation function) ─
  try {
    const result = await processRazorpayWebhook({ eventPayload });

    // Update the WebhookEvent status
    await WebhookEvent.updateOne(
      { razorpayEventId },
      { $set: { status: result.status === "error" ? "error" : "processed" } }
    ).catch(() => {});

    logger.info({ razorpayEventId, eventType, status: result.status }, "[Webhook] Processed");
    return res.status(200).json(new ApiResponse(200, result, "Webhook processed"));
  } catch (err) {
    await WebhookEvent.updateOne(
      { razorpayEventId },
      { $set: { status: "error", errorMessage: err.message } }
    ).catch(() => {});
    throw err;
  }
});

export const refundHandler = asyncHandler(async (req, res) => {
  const { bookingId, reason } = req.body;

  const result = await initiateRefund({
    bookingId,
    customerId: req.user._id,
    reason,
  });

  return res.status(200).json(
    new ApiResponse(200, result, "Booking cancelled and refund processed successfully")
  );
});
