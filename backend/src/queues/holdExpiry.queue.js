import { Queue } from "bullmq";

const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
};

let queueInstance = null;

export const getHoldExpiryQueue = () => {
  if (process.env.NODE_ENV === "test") {
    return null;
  }
  if (!queueInstance) {
    queueInstance = new Queue("hold-expiry", {
      connection: redisConnection,
    });
    queueInstance.on("error", (err) => {
      console.warn("BullMQ Queue Connection Warning:", err.message);
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
    console.warn("Failed to schedule hold expiry job in BullMQ:", err.message);
  }
};

