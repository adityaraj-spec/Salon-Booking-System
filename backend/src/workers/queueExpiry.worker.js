import { Worker } from "bullmq";
import { expireQueueRequest } from "../services/queue.service.js";
import { getBullMQRedisConnection } from "../lib/redis.js";
import logger, { asyncLocalStorage } from "../lib/logger.js";

let queueExpiryWorkerInstance = null;

export const createQueueExpiryWorker = () => {
  if (process.env.NODE_ENV === "test" || process.env.ENABLE_REDIS === "false") return null;
  if (queueExpiryWorkerInstance) return queueExpiryWorkerInstance;

  const WORKER_ID = `queueExpiry_${process.pid}`;

  queueExpiryWorkerInstance = new Worker(
    "queue-expiry",
    async (job) => {
      const contextStore = {
        workerId: WORKER_ID,
        jobId: job.id,
        correlationId: job.data.correlationId || job.id,
        bookingId: job.data.bookingId,
      };

      await asyncLocalStorage.run(contextStore, async () => {
        logger.info({ bookingId: job.data.bookingId }, "[QueueExpiry] Processing queue request expiry");
        await expireQueueRequest(job.data.bookingId);
      });
    },
    {
      connection: getBullMQRedisConnection(),
      concurrency: 5,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: { count: 100, age: 86400 },
        removeOnFail: { count: 200, age: 604800 },
      },
    }
  );

  queueExpiryWorkerInstance.on("completed", (job) => {
    logger.info({ jobId: job.id }, "[QueueExpiry] Job completed");
  });

  queueExpiryWorkerInstance.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, "[QueueExpiry] Job permanently failed");
  });

  queueExpiryWorkerInstance.on("error", (err) => {
    logger.error({ err: err.message }, "[QueueExpiry] Worker connection error");
  });

  logger.info({ workerId: WORKER_ID }, "[QueueExpiry] BullMQ worker started");
  return queueExpiryWorkerInstance;
};

export const closeQueueExpiryWorker = async () => {
  if (queueExpiryWorkerInstance) {
    await queueExpiryWorkerInstance.close();
    queueExpiryWorkerInstance = null;
    logger.info("[QueueExpiry] Worker closed");
  }
};

