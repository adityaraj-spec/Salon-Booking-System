import express from "express";
import { webhookHandler } from "../controllers/payment.controller.js";

const router = express.Router();

/**
 * POST /api/v1/payments/webhook
 *
 * CRITICAL: express.raw() matches all JSON variant content-types (including application/json; charset=utf-8)
 * so raw byte buffer HMAC signature verification works reliably under all proxies and clients.
 */
router.post(
  "/",
  express.raw({
    type: ["application/json", "*/json", "application/json; charset=utf-8"],
    limit: "1mb",
  }),
  webhookHandler
);

export default router;