import { Queue } from "bullmq";
import { getBullMQRedisConnection } from "../lib/redis.js";
import logger from "../lib/logger.js";

let arrivalGraceQueueInstance = null;

export const getArrivalGraceQueue = () => {
  if (process.env.NODE_ENV === "test" || process.env.ENABLE_REDIS === "false") {
    return null;
  }
  if (!arrivalGraceQueueInstance) {
    arrivalGraceQueueInstance = new Queue("arrival-grace", {
      connection: getBullMQRedisConnection(),
    });
    arrivalGraceQueueInstance.on("error", (err) => {
      logger.warn({ err: err.message }, "[ArrivalGraceQueue] BullMQ connection warning");
    });
  }
  return arrivalGraceQueueInstance;
};

/**
 * Schedules a delayed job to warn salon owner when a customer hasn't arrived.
 * Called when salon accepts a queue request.
 *
 * @param {string} bookingId
 * @param {number} graceMinutes - arrivalGraceMinutes from salon queueSettings
 */
export const scheduleArrivalGraceCheck = async (bookingId, graceMinutes = 15) => {
  if (process.env.NODE_ENV === "test" || process.env.ENABLE_REDIS === "false") {
    return;
  }
  try {
    const queue = getArrivalGraceQueue();
    if (queue) {
      const delayMs = graceMinutes * 60 * 1000;
      await queue.add(
        "arrival-grace-check",
        { bookingId },
        {
          delay: delayMs,
          jobId: `arrival-grace-${bookingId}`,
          removeOnComplete: true,
          removeOnFail: true,
        }
      );
      logger.debug({ bookingId, graceMinutes }, "[ArrivalGraceQueue] Arrival grace check scheduled");
    }
  } catch (err) {
    logger.warn({ bookingId, err: err.message }, "[ArrivalGraceQueue] Failed to schedule arrival grace check");
  }
};

/**
 * Cancels an arrival grace check (e.g. when customer actually arrives).
 * @param {string} bookingId
 */
export const cancelArrivalGraceCheck = async (bookingId) => {
  if (process.env.NODE_ENV === "test" || process.env.ENABLE_REDIS === "false") {
    return;
  }
  try {
    const queue = getArrivalGraceQueue();
    if (queue) {
      const job = await queue.getJob(`arrival-grace-${bookingId}`);
      if (job) {
        await job.remove();
        logger.debug({ bookingId }, "[ArrivalGraceQueue] Arrival grace check cancelled");
      }
    }
  } catch (err) {
    logger.warn({ bookingId, err: err.message }, "[ArrivalGraceQueue] Failed to cancel arrival grace check");
  }
};

