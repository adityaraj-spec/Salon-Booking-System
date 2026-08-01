import express from "express";
import { webhookHandler } from "../controllers/payment.controller.js";

const router = express.Router();

/**
 * POST /api/v1/payments/webhook/razorpay
 *
 * CRITICAL: express.raw() must be the body parser for this route, NOT express.json().
 * Razorpay signs the raw byte buffer, not the parsed JSON. If we let express.json()
 * parse the body first, the HMAC verification will fail because re-serialized JSON
 * may not byte-match the original signed payload (whitespace, field ordering, encoding).
 *
 * This router is mounted in app.js BEFORE the global express.json() middleware.
 */
router.post(
  "/razorpay",
  express.raw({ type: "application/json", limit: "1mb" }),
  webhookHandler
);

export default router;
