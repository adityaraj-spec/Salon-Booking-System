import { Worker } from "bullmq";
import { handleArrivalGraceExpiry } from "../services/queue.service.js";
import { getBullMQRedisConnection } from "../lib/redis.js";
import logger, { asyncLocalStorage } from "../lib/logger.js";

let arrivalGraceWorkerInstance = null;

export const createArrivalGraceWorker = () => {
  if (process.env.NODE_ENV === "test" || process.env.ENABLE_REDIS === "false") return null;
  if (arrivalGraceWorkerInstance) return arrivalGraceWorkerInstance;

  const WORKER_ID = `arrivalGrace_${process.pid}`;

  arrivalGraceWorkerInstance = new Worker(
    "arrival-grace",
    async (job) => {
      const contextStore = {
        workerId: WORKER_ID,
        jobId: job.id,
        correlationId: job.data.correlationId || job.id,
        bookingId: job.data.bookingId,
      };

      await asyncLocalStorage.run(contextStore, async () => {
        logger.info({ bookingId: job.data.bookingId }, "[ArrivalGrace] Checking arrival grace period expiry");
        await handleArrivalGraceExpiry(job.data.bookingId);
      });
    },
    {
      connection: getBullMQRedisConnection(),
      concurrency: 5,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: { count: 100, age: 86400 },
        removeOnFail: { count: 200, age: 604800 },
      },
    }
  );

  arrivalGraceWorkerInstance.on("completed", (job) => {
    logger.info({ jobId: job.id }, "[ArrivalGrace] Job completed");
  });

  arrivalGraceWorkerInstance.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, "[ArrivalGrace] Job permanently failed");
  });

  arrivalGraceWorkerInstance.on("error", (err) => {
    logger.error({ err: err.message }, "[ArrivalGrace] Worker connection error");
  });

  logger.info({ workerId: WORKER_ID }, "[ArrivalGrace] BullMQ worker started");
  return arrivalGraceWorkerInstance;
};

export const closeArrivalGraceWorker = async () => {
  if (arrivalGraceWorkerInstance) {
    await arrivalGraceWorkerInstance.close();
    arrivalGraceWorkerInstance = null;
    logger.info("[ArrivalGrace] Worker closed");
  }
};

