import { Worker } from "bullmq";
import { expireHold } from "../services/hold.service.js";
import logger from "../lib/logger.js";

const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  maxRetriesPerRequest: null,
};

let holdExpiryWorkerInstance = null;

/**
 * Creates and returns the hold-expiry BullMQ worker.
 * Safe to call multiple times — returns the same instance.
 */
export const createHoldExpiryWorker = () => {
  if (process.env.NODE_ENV === "test") return null;
  if (holdExpiryWorkerInstance) return holdExpiryWorkerInstance;

  holdExpiryWorkerInstance = new Worker(
    "hold-expiry",
    async (job) => {
      logger.info({ holdId: job.data.holdId }, "Processing hold expiry job");
      await expireHold(job.data.holdId);
    },
    { connection: redisConnection, concurrency: 5 }
  );

  holdExpiryWorkerInstance.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Hold expiry job completed");
  });

  holdExpiryWorkerInstance.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, "Hold expiry job failed");
  });

  holdExpiryWorkerInstance.on("error", (err) => {
    logger.error({ err: err.message }, "Hold expiry worker connection error");
  });

  logger.info("Hold expiry BullMQ worker started");
  return holdExpiryWorkerInstance;
};

/**
 * Gracefully closes the hold expiry worker.
 * Call this during application shutdown.
 */
export const closeHoldExpiryWorker = async () => {
  if (holdExpiryWorkerInstance) {
    await holdExpiryWorkerInstance.close();
    holdExpiryWorkerInstance = null;
    logger.info("Hold expiry worker closed");
  }
};
