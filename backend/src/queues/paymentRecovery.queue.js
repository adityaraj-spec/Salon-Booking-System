import { Queue } from "bullmq";
import { getBullMQRedisConnection } from "../lib/redis.js";
import logger from "../lib/logger.js";

let queueInstance = null;

export const getPaymentRecoveryQueue = () => {
  if (process.env.NODE_ENV === "test") {
    return null;
  }
  if (!queueInstance) {
    queueInstance = new Queue("payment-recovery", {
      connection: getBullMQRedisConnection(),
    });
    queueInstance.on("error", (err) => {
    logger.warn({ err: err.message }, "[PaymentRecoveryQueue] BullMQ connection warning");
    });
  }
  return queueInstance;
};

/**
 * Schedules a delayed job to check unconfirmed payments after 15 minutes.
 * @param {string} bookingId
 * @param {number} delayMs - default 15 minutes (900,000 ms)
 */
export const schedulePaymentRecovery = async (bookingId, delayMs = 15 * 60 * 1000) => {
  if (process.env.NODE_ENV === "test") {
    return;
  }
  try {
    const queue = getPaymentRecoveryQueue();
    if (queue) {
      await queue.add(
        "recover-payment",
        { bookingId },
        {
          delay: delayMs,
          jobId: `payment-recovery-${bookingId}`,
          removeOnComplete: true,
          removeOnFail: false, // keep failed jobs visible for debugging
          // Exponential backoff: attempt 1=5s, 2=10s, 3=20s, 4=40s, 5=80s
          attempts: 5,
          backoff: {
            type: "exponential",
            delay: 5000,
          },
        }
      );
    }
  } catch (err) {
    logger.warn({ bookingId, err: err.message }, "[PaymentRecoveryQueue] Failed to schedule recovery job");
  }
};
