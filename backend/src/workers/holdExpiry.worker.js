import { Worker } from "bullmq";
import { expireHold } from "../services/hold.service.js";
import { getBullMQRedisConnection } from "../lib/redis.js";
import logger, { asyncLocalStorage } from "../lib/logger.js";

let holdExpiryWorkerInstance = null;

/**
 * Creates and returns the hold-expiry BullMQ worker.
 * Safe to call multiple times — returns the same instance.
 *
 * Each job is processed inside an AsyncLocalStorage context seeded with:
 *   - workerId:      identifies this worker process
 *   - jobId:         BullMQ job ID for deduplication / tracing
 *   - correlationId: forwarded from job.data if the producer set it
 *   - holdId:        the specific hold being expired
 */
export const createHoldExpiryWorker = () => {
  if (process.env.NODE_ENV === "test") return null;
  if (holdExpiryWorkerInstance) return holdExpiryWorkerInstance;

  const WORKER_ID = `holdExpiry_${process.pid}`;

  holdExpiryWorkerInstance = new Worker(
    "hold-expiry",
    async (job) => {
      // Seed async context so every logger call inside expireHold() carries this metadata
      const contextStore = {
        workerId:      WORKER_ID,
        jobId:         job.id,
        correlationId: job.data.correlationId || job.id,
        requestId:     job.data.requestId     || job.id,
        holdId:        job.data.holdId,
      };

      await asyncLocalStorage.run(contextStore, async () => {
        logger.info({ holdId: job.data.holdId }, "[HoldExpiry] Processing hold expiry job");
        await expireHold(job.data.holdId);
      });
    },
    {
      connection:  getBullMQRedisConnection(),
      concurrency: 5,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: { count: 100, age: 86400 },
        removeOnFail: { count: 200, age: 604800 },
      },
    }
  );

  holdExpiryWorkerInstance.on("completed", (job) => {
    logger.info({ jobId: job.id }, "[HoldExpiry] Job completed");
  });

  holdExpiryWorkerInstance.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, "[HoldExpiry] Job permanently failed");
  });

  holdExpiryWorkerInstance.on("error", (err) => {
    logger.error({ err: err.message }, "[HoldExpiry] Worker connection error");
  });

  logger.info({ workerId: WORKER_ID }, "[HoldExpiry] BullMQ worker started");
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
    logger.info("[HoldExpiry] Worker closed");
  }
};
