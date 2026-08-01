import { Worker } from "bullmq";
import { Booking } from "../models/booking.models.js";
import { Payment } from "../models/payment.models.js";
import { razorpayClient } from "../utils/razorpay.js";
import { confirmBookingAfterPayment, cancelPendingBooking } from "../services/booking.service.js";
import logger from "../lib/logger.js";

const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  maxRetriesPerRequest: null,
};

let paymentRecoveryWorkerInstance = null;

/**
 * Gap 3.1 — Payment Recovery Worker
 *
 * 15 minutes after a booking is initiated (pending_payment), this worker checks
 * Razorpay for the actual payment status. If payment was captured, the booking is
 * confirmed. If not, the booking is cancelled and capacity is freed.
 *
 * This handles the case where:
 * - A user dropped off mid-payment
 * - Razorpay webhook failed to deliver
 * - Network issues prevented the verify endpoint from being called
 */
export const createPaymentRecoveryWorker = () => {
  if (process.env.NODE_ENV === "test") return null;
  if (paymentRecoveryWorkerInstance) return paymentRecoveryWorkerInstance;

  paymentRecoveryWorkerInstance = new Worker(
    "payment-recovery",
    async (job) => {
      const { bookingId } = job.data;
      logger.info({ bookingId }, "[PaymentRecovery] Checking pending payment");

      const booking = await Booking.findById(bookingId);
      if (!booking) {
        logger.warn({ bookingId }, "[PaymentRecovery] Booking not found, skipping");
        return;
      }

      // Already resolved — skip
      if (booking.status !== "pending_payment") {
        logger.info({ bookingId, status: booking.status }, "[PaymentRecovery] Booking already resolved");
        return;
      }

      // Look up Razorpay payment record
      const payment = await Payment.findOne({ booking: bookingId });
      if (!payment || !payment.razorpayPaymentId) {
        // No payment ever initiated — cancel the booking
        logger.warn({ bookingId }, "[PaymentRecovery] No payment record found, cancelling booking");
        await cancelPendingBooking(bookingId, booking.customer?.toString());
        return;
      }

      try {
        // Query Razorpay for actual payment status
        const razorpayPayment = await razorpayClient.payments.fetch(payment.razorpayPaymentId);

        if (razorpayPayment.status === "captured") {
          // Payment succeeded but webhook/verify failed — confirm booking now
          logger.info({ bookingId, razorpayPaymentId: payment.razorpayPaymentId }, "[PaymentRecovery] Payment captured, confirming booking");
          await confirmBookingAfterPayment(bookingId);
          payment.status = "captured";
          await payment.save();
        } else {
          // Payment failed or was never completed — cancel booking
          logger.warn({ bookingId, razorpayStatus: razorpayPayment.status }, "[PaymentRecovery] Payment not captured, cancelling booking");
          await cancelPendingBooking(bookingId, booking.customer?.toString());
          payment.status = "failed";
          await payment.save();
        }
      } catch (err) {
        // If Razorpay API call itself fails, log and let BullMQ retry
        logger.error({ bookingId, err: err.message }, "[PaymentRecovery] Razorpay fetch failed");
        throw err; // triggers BullMQ retry with backoff
      }
    },
    {
      connection: redisConnection,
      concurrency: 3,
      // Retry 3 times with exponential backoff if Razorpay API is temporarily unavailable
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
      },
    }
  );

  paymentRecoveryWorkerInstance.on("completed", (job) => {
    logger.info({ jobId: job.id }, "[PaymentRecovery] Job completed");
  });

  paymentRecoveryWorkerInstance.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, "[PaymentRecovery] Job permanently failed");
  });

  paymentRecoveryWorkerInstance.on("error", (err) => {
    logger.error({ err: err.message }, "[PaymentRecovery] Worker connection error");
  });

  logger.info("Payment recovery BullMQ worker started");
  return paymentRecoveryWorkerInstance;
};

export const closePaymentRecoveryWorker = async () => {
  if (paymentRecoveryWorkerInstance) {
    await paymentRecoveryWorkerInstance.close();
    paymentRecoveryWorkerInstance = null;
    logger.info("[PaymentRecovery] Worker closed");
  }
};
