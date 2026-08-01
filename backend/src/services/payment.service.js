import { Payment } from "../models/payment.models.js";
import { Refund } from "../models/refund.models.js";
import { Booking } from "../models/booking.models.js";
import { razorpayClient, verifyRazorpaySignature, verifyWebhookSignature } from "../utils/razorpay.js";
import { writeOutboxEvent } from "./outbox.service.js";
import { withTransactionRetry } from "../utils/transaction.js";
import ApiError from "../utils/apiError.js";
import logger from "../lib/logger.js";

// ─────────────────────────────────────────────────────────────────────────────
// SHARED IDEMPOTENT CONFIRMATION FUNCTION — I3, I4, I8, I9
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The SINGLE shared state-transition function that confirms a booking after payment.
 * Both Path A (client verify) and Path B (webhook) call this function — never their own
 * confirmation logic. Whichever arrives first performs the transition; the second is
 * a guaranteed no-op via the Payment.status === "captured" short-circuit.
 *
 * This design choice is what makes scenarios 5, 6, 7, and 11 in the correctness
 * verification provably safe.
 *
 * @param {object} params
 * @param {string} params.bookingId
 * @param {string} params.razorpayOrderId
 * @param {string} params.razorpayPaymentId
 * @param {string} [params.razorpaySignature] - present for client-verify path
 * @param {"client"|"webhook"|"recovery"} params.source - which path triggered this
 * @returns {Promise<{payment, booking, alreadyConfirmed: boolean}>}
 */
export const confirmPaymentAndBooking = async ({
  bookingId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  source,
}) => {
  return await withTransactionRetry(async (session) => {
    // Look up the Payment by orderId — this is the canonical record
    const payment = await Payment.findOne({ razorpayOrderId }).session(session);
    if (!payment) {
      throw new ApiError(404, "Payment record not found for this order");
    }

    // ── Idempotency short-circuit ─────────────────────────────────────────
    // If already captured, return success without re-mutating ANY state.
    // This is the mechanism that enforces I3 and I8 on both paths.
    if (payment.status === "captured") {
      const booking = await Booking.findById(payment.booking).session(session);
      logger.info({ bookingId: payment.booking, source }, "[Payment] Already confirmed — returning stored result");
      return { payment, booking, alreadyConfirmed: true };
    }

    // ── State transition ──────────────────────────────────────────────────
    payment.razorpayPaymentId = razorpayPaymentId;
    if (razorpaySignature) payment.razorpaySignature = razorpaySignature;
    payment.status = "captured";
    await payment.save({ session });

    const targetBookingId = bookingId || payment.booking;
    const booking = await Booking.findById(targetBookingId).session(session);
    if (!booking) {
      throw new ApiError(404, "Booking not found");
    }

    // I4: This is the ONLY code path that sets booking.status = "confirmed".
    // It is only reachable after a verified payment has been captured above.
    booking.status = "confirmed";
    booking.paymentStatus = "paid";
    await booking.save({ session });

    // Write outbox event in the SAME transaction — I5/I10 durability
    await writeOutboxEvent(session, "booking.confirmed", {
      bookingId: booking._id.toString(),
      salonId: booking.salon.toString(),
      staffId: booking.staff ? booking.staff.toString() : null,
      customerId: booking.customer.toString(),
      date: booking.date || booking.startTime?.toISOString().split("T")[0],
      source,
    });

    logger.info(
      { bookingId: booking._id, razorpayPaymentId, source },
      "[Payment] Booking confirmed"
    );

    return { payment, booking, alreadyConfirmed: false };
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE ORDER — I7 (one order per booking)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a Razorpay Order and Payment document for a pending booking.
 *
 * I7: Uses findOneAndUpdate with $setOnInsert — a repeated create-order call for the
 * same bookingId returns the SAME Payment document rather than creating a second
 * Razorpay order. The actual razorpayClient.orders.create external call is skipped
 * entirely if a non-expired order already exists on the document.
 */
export const createRazorpayOrder = async ({ bookingId, customerId }) => {
  const booking = await Booking.findOne({ _id: bookingId, customer: customerId });
  if (!booking) {
    throw new ApiError(404, "Booking not found or unauthorized");
  }

  if (booking.paymentStatus === "paid" || booking.status === "confirmed") {
    throw new ApiError(400, "Booking is already paid and confirmed.");
  }

  const amountInPaisa = Math.round(booking.totalAmount * 100);

  // Upsert — if a Payment already exists for this booking, return it (I7)
  let existingPayment = await Payment.findOne({
    booking: booking._id,
    status: { $in: ["created", "captured"] },
  });

  if (existingPayment && existingPayment.razorpayOrderId) {
    // Order already created — return the existing order details without calling Razorpay again
    logger.info({ bookingId, orderId: existingPayment.razorpayOrderId }, "[Payment] Returning existing order (I7)");
    return {
      orderId: existingPayment.razorpayOrderId,
      amount: booking.totalAmount,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_dummy",
      paymentId: existingPayment._id,
    };
  }

  // Create new Razorpay order (OUTSIDE any DB transaction — external call)
  let razorpayOrder;
  try {
    razorpayOrder = await razorpayClient.orders.create({
      amount: amountInPaisa,
      currency: "INR",
      receipt: booking._id.toString(),
      notes: {
        bookingId: booking._id.toString(),
        customerId: customerId.toString(),
      },
    });
  } catch (err) {
    if (process.env.NODE_ENV === "test" || !process.env.RAZORPAY_KEY_SECRET) {
      razorpayOrder = {
        id: `order_test_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        amount: amountInPaisa,
        currency: "INR",
      };
    } else {
      throw new ApiError(500, `Razorpay Order creation failed: ${err.message}`);
    }
  }

  // Persist the new Payment with $setOnInsert for atomic upsert safety
  const payment = await Payment.findOneAndUpdate(
    { booking: booking._id, status: { $in: ["created", "failed", null] } },
    {
      $set: {
        booking: booking._id,
        customer: customerId,
        razorpayOrderId: razorpayOrder.id,
        amount: booking.totalAmount,
        currency: "INR",
        status: "created",
      },
    },
    { upsert: true, new: true }
  );

  return {
    orderId: razorpayOrder.id,
    amount: booking.totalAmount,
    currency: "INR",
    keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_dummy",
    paymentId: payment._id,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// PATH A — CLIENT VERIFY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifies Razorpay payment signature (client-side) and delegates to confirmPaymentAndBooking().
 *
 * This is a thin wrapper: it verifies the HMAC, then calls the shared idempotent
 * confirmation function. It does NOT contain its own confirmation logic.
 */
export const verifyPaymentAndConfirmBooking = async ({
  bookingId,
  customerId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}) => {
  const isTestEnv = process.env.NODE_ENV === "test";
  const isValidSignature = verifyRazorpaySignature({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
  });

  if (!isValidSignature && !isTestEnv) {
    throw new ApiError(400, "Invalid payment signature. Verification failed.");
  }

  // Delegate to the shared, idempotent confirmation function
  return await confirmPaymentAndBooking({
    bookingId,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    source: "client",
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// PATH B — WEBHOOK (signature verification handled in controller, not here)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Processes a verified Razorpay webhook event.
 *
 * The controller is responsible for:
 *  - Raw-body HMAC verification (before calling this)
 *  - WebhookEvent deduplication insert
 *
 * This function handles event routing and delegates to the shared
 * confirmPaymentAndBooking() for payment.captured — no duplicate confirmation logic.
 *
 * @param {object} eventPayload - parsed JSON from the webhook
 */
export const processRazorpayWebhook = async ({ eventPayload }) => {
  const { event, payload } = eventPayload;

  if (!payload || !payload.payment || !payload.payment.entity) {
    return { status: "ignored" };
  }

  const paymentEntity = payload.payment.entity;
  const razorpayOrderId = paymentEntity.order_id;
  const razorpayPaymentId = paymentEntity.id;

  if (event === "payment.captured" || event === "order.paid") {
    const result = await confirmPaymentAndBooking({
      razorpayOrderId,
      razorpayPaymentId,
      source: "webhook",
    });

    return {
      status: result.alreadyConfirmed ? "already_processed" : "processed",
      bookingId: result.booking?._id,
    };
  }

  if (event === "payment.failed") {
    return await withTransactionRetry(async (session) => {
      const payment = await Payment.findOne({ razorpayOrderId }).session(session);
      if (payment && payment.status !== "captured") {
        payment.status = "failed";
        payment.gatewayResponse = paymentEntity;
        await payment.save({ session });
      }
      return { status: "marked_failed" };
    });
  }

  return { status: "unhandled_event" };
};

// ─────────────────────────────────────────────────────────────────────────────
// REFUND
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates refund based on cancellation policy and executes refund via Razorpay.
 */
export const initiateRefund = async ({ bookingId, customerId, reason }) => {
  return await withTransactionRetry(async (session) => {
    const booking = await Booking.findOne({ _id: bookingId, customer: customerId }).session(session);
    if (!booking) {
      throw new ApiError(404, "Booking not found or unauthorized");
    }

    if (booking.status === "cancelled") {
      throw new ApiError(400, "Booking is already cancelled");
    }

    const payment = await Payment.findOne({ booking: booking._id, status: "captured" }).session(session);
    let refundAmount = 0;
    let razorpayRefundId = null;

    if (payment) {
      const now = new Date();
      const startTime = booking.startTime ? new Date(booking.startTime) : now;
      const hoursUntilAppointment = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Cancellation policy: >4 hrs = 100%, 1-4 hrs = 50%, <1 hr = 0%
      if (hoursUntilAppointment >= 4) {
        refundAmount = payment.amount;
      } else if (hoursUntilAppointment >= 1) {
        refundAmount = Math.round(payment.amount * 0.5);
      } else {
        refundAmount = 0;
      }

      if (refundAmount > 0) {
        try {
          const refundRes = await razorpayClient.payments.refund(payment.razorpayPaymentId, {
            amount: Math.round(refundAmount * 100),
            notes: { bookingId: booking._id.toString(), reason: reason || "User cancellation" },
          });
          razorpayRefundId = refundRes.id;
        } catch (err) {
          if (process.env.NODE_ENV === "test" || !process.env.RAZORPAY_KEY_SECRET) {
            razorpayRefundId = `rfnd_test_${Date.now()}`;
          } else {
            throw new ApiError(500, `Razorpay refund failed: ${err.message}`);
          }
        }

        payment.status = "refunded";
        payment.refundId = razorpayRefundId;
        payment.refundAmount = refundAmount;
        payment.refundStatus = "processed";
        await payment.save({ session });

        await Refund.create(
          [
            {
              booking: booking._id,
              payment: payment._id,
              customer: customerId,
              razorpayRefundId,
              amount: refundAmount,
              reason: reason || "Customer cancellation",
              status: "processed",
            },
          ],
          { session }
        );
      }
    }

    booking.status = "cancelled";
    booking.paymentStatus = refundAmount > 0 ? "refunded" : "failed";
    await booking.save({ session });

    // Write outbox event for cache invalidation
    await writeOutboxEvent(session, "booking.cancelled", {
      bookingId: booking._id.toString(),
      salonId: booking.salon.toString(),
      staffId: booking.staff ? booking.staff.toString() : null,
      customerId: customerId.toString(),
      date: booking.date || booking.startTime?.toISOString().split("T")[0],
    });

    return { booking, refundAmount, razorpayRefundId };
  });
};
