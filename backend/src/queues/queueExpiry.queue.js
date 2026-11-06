import { Queue } from "bullmq";
import { getBullMQRedisConnection } from "../lib/redis.js";
import logger from "../lib/logger.js";

let queueInstance = null;

export const getQueueExpiryQueue = () => {
  if (process.env.NODE_ENV === "test" || process.env.ENABLE_REDIS === "false") {
    return null;
  }
  if (!queueInstance) {
    queueInstance = new Queue("queue-expiry", {
      connection: getBullMQRedisConnection(),
    });
    queueInstance.on("error", (err) => {
      logger.warn({ err: err.message }, "[QueueExpiryQueue] BullMQ connection warning");
    });
  }
  return queueInstance;
};

/**
 * Schedules a delayed job to expire an unaccepted queue request after delayMs.
 * @param {string} bookingId
 * @param {number} delayMs
 */
export const scheduleQueueExpiry = async (bookingId, delayMs) => {
  if (process.env.NODE_ENV === "test" || process.env.ENABLE_REDIS === "false") {
    return;
  }
  try {
    const queue = getQueueExpiryQueue();
    if (queue) {
      await queue.add(
        "expire-queue-request",
        { bookingId },
        {
          delay: delayMs,
          jobId: `queue-expiry-${bookingId}`,
          removeOnComplete: true,
          removeOnFail: true,
        }
      );
    }
  } catch (err) {
    logger.warn({ bookingId, err: err.message }, "[QueueExpiryQueue] Failed to schedule queue expiry job");
  }
};

/**
 * Cancels a scheduled queue expiry job (e.g. when salon accepts or rejects).
 * @param {string} bookingId
 */
export const cancelQueueExpiry = async (bookingId) => {
  if (process.env.NODE_ENV === "test" || process.env.ENABLE_REDIS === "false") {
    return;
  }
  try {
    const queue = getQueueExpiryQueue();
    if (queue) {
      const job = await queue.getJob(`queue-expiry-${bookingId}`);
      if (job) {
        await job.remove();
      }
    }
  } catch (err) {
    logger.warn({ bookingId, err: err.message }, "[QueueExpiryQueue] Failed to cancel queue expiry job");
  }
};

