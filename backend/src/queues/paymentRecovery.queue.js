import { Queue } from "bullmq";

const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
};

let queueInstance = null;

export const getPaymentRecoveryQueue = () => {
  if (process.env.NODE_ENV === "test") {
    return null;
  }
  if (!queueInstance) {
    queueInstance = new Queue("payment-recovery", {
      connection: redisConnection,
    });
    queueInstance.on("error", (err) => {
      console.warn("[PaymentRecoveryQueue] Connection warning:", err.message);
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
          removeOnFail: true,
        }
      );
    }
  } catch (err) {
    console.warn("[PaymentRecoveryQueue] Failed to schedule recovery job:", err.message);
  }
};
