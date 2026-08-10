import { Worker } from "bullmq";
import { Booking } from "../models/booking.models.js";
import { Payment } from "../models/payment.models.js";
import { razorpayFetchPayment } from "../utils/razorpayBreaker.js";
import { confirmPaymentAndBooking } from "../services/payment.service.js";
import { cancelPendingBooking } from "../services/booking.service.js";
import { getBullMQRedisConnection } from "../lib/redis.js";
import logger, { asyncLocalStorage } from "../lib/logger.js";
import {
  paymentRecoveryRetriesTotal,
  paymentRecoveryPermanentFailuresTotal,
} from "../lib/metrics.js";

let paymentRecoveryWorkerInstance = null;

/**
 * Payment Recovery Worker
 *
 * 15 minutes after a booking is initiated (pending_payment), this worker checks
 * Razorpay for the actual payment status. If payment was captured, the booking is
 * confirmed via the shared confirmPaymentAndBooking() function. If not, the booking
 * is cancelled and capacity is freed.
 *
 * Resilience chain:
 *   razorpayFetchPayment() → timeout (8 s) + circuit breaker
 *   BullMQ job             → 5 attempts with exponential backoff (5 s, 10 s, 20 s, 40 s, 80 s)
 *   On final failure       → booking left as pending_payment; admin alert via log
 *
 * Each job is processed inside an AsyncLocalStorage context so every log call
 * inside confirmPaymentAndBooking(), cancelPendingBooking(), etc. carries:
 *   - workerId, jobId, correlationId, bookingId
 */
export const createPaymentRecoveryWorker = () => {
  if (process.env.NODE_ENV === "test") return null;
  if (paymentRecoveryWorkerInstance) return paymentRecoveryWorkerInstance;

  const WORKER_ID = `paymentRecovery_${process.pid}`;
  const MAX_ATTEMPTS = 5;

  paymentRecoveryWorkerInstance = new Worker(
    "payment-recovery",
    async (job) => {
      const { bookingId } = job.data;
      const attemptNumber = (job.attemptsMade || 0) + 1;

      // Seed async context for full traceability of this job's execution
      const contextStore = {
        workerId:      WORKER_ID,
        jobId:         job.id,
        correlationId: job.data.correlationId || job.id,
        requestId:     job.data.requestId     || job.id,
        bookingId,
      };

      await asyncLocalStorage.run(contextStore, async () => {
        logger.info(
          { bookingId, attempt: attemptNumber, maxAttempts: MAX_ATTEMPTS },
          "[PaymentRecovery] Processing job"
        );

        const booking = await Booking.findById(bookingId);
        if (!booking) {
          logger.warn({ bookingId }, "[PaymentRecovery] Booking not found — skipping");
          return; // do not throw — no point retrying a non-existent booking
        }

        if (booking.status !== "pending_payment") {
          logger.info(
            { bookingId, status: booking.status },
            "[PaymentRecovery] Booking already resolved — skipping"
          );
          return; // idempotent — safe to skip
        }

        const payment = await Payment.findOne({ booking: bookingId });

        // If no Razorpay payment ID was ever stored, the user never reached checkout.
        // Cancel immediately — no point querying Razorpay.
        if (!payment || !payment.razorpayPaymentId) {
          logger.warn({ bookingId }, "[PaymentRecovery] No Razorpay payment ID found — cancelling booking");
          await cancelPendingBooking(bookingId, booking.customer?.toString());
          return;
        }

        // ── Razorpay fetch via circuit breaker + timeout ──────────────────
        let razorpayPayment;
        try {
          razorpayPayment = await razorpayFetchPayment(payment.razorpayPaymentId);
        } catch (err) {
          const isTimeout = err.name === "RazorpayTimeoutError";
          const isOpen    = err.message?.toLowerCase().includes("open");

          logger.error(
            {
              bookingId,
              razorpayPaymentId: payment.razorpayPaymentId,
              err: err.message,
              isTimeout,
              isOpen,
              attempt: attemptNumber,
              maxAttempts: MAX_ATTEMPTS,
            },
            isTimeout
              ? "[PaymentRecovery] Razorpay fetch timed out — will retry with backoff"
              : isOpen
              ? "[PaymentRecovery] Circuit breaker OPEN — will retry after reset"
              : "[PaymentRecovery] Razorpay fetch failed — will retry"
          );

          // Increment retry metric before throwing (M2 requirement #10)
          const reason = isTimeout ? "timeout" : isOpen ? "breaker_open" : "other";
          try { paymentRecoveryRetriesTotal.inc({ reason }); } catch {}

          // Throw to trigger BullMQ exponential-backoff retry
          throw err;
        }

        // ── Process the result ────────────────────────────────────────────
        if (razorpayPayment.status === "captured") {
          logger.info(
            { bookingId, razorpayPaymentId: payment.razorpayPaymentId },
            "[PaymentRecovery] Payment captured — confirming booking"
          );
          // confirmPaymentAndBooking() is idempotent via payment.status === "captured" guard.
          // If webhook already confirmed it between job enqueue and now, this is a no-op.
          await confirmPaymentAndBooking({
            bookingId,
            razorpayOrderId:   payment.razorpayOrderId,
            razorpayPaymentId: payment.razorpayPaymentId,
            source:            "recovery",
          });
        } else {
          logger.warn(
            { bookingId, razorpayStatus: razorpayPayment.status },
            "[PaymentRecovery] Payment not captured — cancelling booking"
          );
          await cancelPendingBooking(bookingId, booking.customer?.toString());
          payment.status = "failed";
          await payment.save();
        }
      });
    },
    {
      connection: getBullMQRedisConnection(),
      concurrency: 3,
    }
  );

  paymentRecoveryWorkerInstance.on("completed", (job) => {
    logger.info({ jobId: job.id }, "[PaymentRecovery] Job completed successfully");
  });

  paymentRecoveryWorkerInstance.on("failed", (job, err) => {
    const attemptsMade = job?.attemptsMade || 0;
    const willRetry    = attemptsMade < MAX_ATTEMPTS;
    logger.error(
      {
        jobId:       job?.id,
        bookingId:   job?.data?.bookingId,
        err:         err.message,
        attemptsMade,
        willRetry,
      },
      willRetry
        ? "[PaymentRecovery] Job attempt failed — BullMQ will retry with backoff"
        : "[PaymentRecovery] Job permanently failed — all attempts exhausted"
    );
    // Increment permanent failure counter when no retries remain (M2 requirement #10)
    if (!willRetry) {
      try { paymentRecoveryPermanentFailuresTotal.inc(); } catch {}
    }
  });

  paymentRecoveryWorkerInstance.on("error", (err) => {
    logger.error({ err: err.message }, "[PaymentRecovery] Worker connection error");
  });

  logger.info({ workerId: WORKER_ID }, "[PaymentRecovery] Worker started");
  return paymentRecoveryWorkerInstance;
};

export const closePaymentRecoveryWorker = async () => {
  if (paymentRecoveryWorkerInstance) {
    await paymentRecoveryWorkerInstance.close();
    paymentRecoveryWorkerInstance = null;
    logger.info("[PaymentRecovery] Worker closed");
  }
};
