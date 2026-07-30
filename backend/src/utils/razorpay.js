import Razorpay from "razorpay";
import crypto from "crypto";

const razorpayKeyId = process.env.RAZORPAY_KEY_ID || "rzp_test_dummy";
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || "dummy_secret";

export const razorpayClient = new Razorpay({
  key_id: razorpayKeyId,
  key_secret: razorpayKeySecret,
});

/**
 * Verifies Razorpay checkout signature for client callback.
 * @param {object} params
 * @param {string} params.orderId
 * @param {string} params.paymentId
 * @param {string} params.signature
 * @returns {boolean}
 */
export const verifyRazorpaySignature = ({ orderId, paymentId, signature }) => {
  if (!orderId || !paymentId || !signature) return false;

  const secret = process.env.RAZORPAY_KEY_SECRET || "dummy_secret";
  const generatedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const bufferA = Buffer.from(generatedSignature, "utf8");
  const bufferB = Buffer.from(signature, "utf8");

  if (bufferA.length !== bufferB.length) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
};

/**
 * Verifies Razorpay webhook HMAC SHA-256 signature header.
 * @param {string|Buffer} body
 * @param {string} signatureHeader
 * @param {string} webhookSecret
 * @returns {boolean}
 */
export const verifyWebhookSignature = (body, signatureHeader, webhookSecret) => {
  if (!body || !signatureHeader) return false;

  const secret = webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET || "dummy_webhook_secret";
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(typeof body === "string" ? body : JSON.stringify(body))
    .digest("hex");

  const bufferA = Buffer.from(expectedSignature, "utf8");
  const bufferB = Buffer.from(signatureHeader, "utf8");

  if (bufferA.length !== bufferB.length) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
};
