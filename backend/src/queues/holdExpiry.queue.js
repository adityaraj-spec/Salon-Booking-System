import { Queue } from "bullmq";
import { getBullMQRedisConnection } from "../lib/redis.js";
import logger from "../lib/logger.js";

let queueInstance = null;

export const getHoldExpiryQueue = () => {
  if (process.env.NODE_ENV === "test") {
    return null;
  }
  if (!queueInstance) {
    queueInstance = new Queue("hold-expiry", {
      connection: getBullMQRedisConnection(),

    });
    queueInstance.on("error", (err) => {
      logger.warn({ err: err.message }, "[HoldExpiryQueue] BullMQ connection warning");
    });
  }
  return queueInstance;
};

/**
 * Schedules a delayed job to expire a hold after the given delay in milliseconds.
 * @param {string} holdId
 * @param {number} delayMs
 */
export const scheduleHoldExpiry = async (holdId, delayMs) => {
  if (process.env.NODE_ENV === "test") {
    return;
  }
  try {
    const queue = getHoldExpiryQueue();
    if (queue) {
      await queue.add(
        "expire-hold",
        { holdId },
        {
          delay: delayMs,
          jobId: `hold-expiry-${holdId}`,
          removeOnComplete: true,
          removeOnFail: true,
        }
      );
    }
  } catch (err) {
    logger.warn({ holdId, err: err.message }, "[HoldExpiryQueue] Failed to schedule hold expiry job");
  }
};

