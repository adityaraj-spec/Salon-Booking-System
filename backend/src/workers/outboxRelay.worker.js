import { OutboxEvent } from "../models/outboxEvent.model.js";
import { dispatchOutboxEvent } from "../services/outbox.service.js";
import logger from "../lib/logger.js";

const POLL_INTERVAL_MS = 1500; // 1.5 seconds
const BATCH_SIZE = 50;
const LEASE_DURATION_MS = 30000; // 30 second worker lease
const MAX_ATTEMPTS = 5;

const WORKER_ID = `worker_${process.pid}_${Math.random().toString(36).slice(2, 7)}`;
let isRunning = false;
let timerId = null;

/**
 * Atomically claims ONE unprocessed OutboxEvent using findOneAndUpdate with lease locking.
 * Safe for multi-instance API deployments — exactly one worker instance can claim each event.
 */
export const claimAndProcessNextEvent = async () => {
  const now = new Date();
  const leaseExpiration = new Date(now.getTime() + LEASE_DURATION_MS);

  // Atomic claim query (finds event that is not processed, not dead_letter, attempts < 5, and lease expired or unassigned)
  const event = await OutboxEvent.findOneAndUpdate(
    {
      processed: false,
      status: { $ne: "dead_letter" },
      attempts: { $lt: MAX_ATTEMPTS },
      $or: [
        { lockedUntil: null },
        { lockedUntil: { $lt: now } },
      ],
    },
    {
      $set: {
        status: "processing",
        lockedBy: WORKER_ID,
        lockedUntil: leaseExpiration,
      },
      $inc: { attempts: 1 },
    },
    {
      new: true,
      sort: { createdAt: 1 }, // Process oldest events first
    }
  );

  if (!event) return false;

  logger.debug({ eventId: event._id, type: event.type, workerId: WORKER_ID }, "[OutboxRelay] Event claimed");

  try {
    // Execute handler
    await dispatchOutboxEvent(event);

    // Mark completed
    await OutboxEvent.updateOne(
      { _id: event._id },
      {
        $set: {
          status: "processed",
          processed: true,
          processedAt: new Date(),
          lockedBy: null,
          lockedUntil: null,
          lastError: null,
        },
      }
    );
    logger.debug({ eventId: event._id, type: event.type }, "[OutboxRelay] Event processed successfully");
  } catch (err) {
    logger.error({ eventId: event._id, type: event.type, attempts: event.attempts, err: err.message }, "[OutboxRelay] Event processing failed");

    // Poison event check (Item 6): If reached MAX_ATTEMPTS, transition to dead_letter so it stops blocking
    const isPoison = event.attempts >= MAX_ATTEMPTS;
    const newStatus = isPoison ? "dead_letter" : "pending";

    if (isPoison) {
      logger.error({ eventId: event._id, type: event.type }, "[OutboxRelay] Event marked as DEAD_LETTER (poison event threshold reached)");
    }

    await OutboxEvent.updateOne(
      { _id: event._id },
      {
        $set: {
          status: newStatus,
          lastError: err.message,
          lockedBy: null,
          lockedUntil: null,
        },
      }
    ).catch((e) => logger.warn({ e: e.message }, "[OutboxRelay] Failed to update event error status"));
  }

  return true; // Claimed and processed one event
};

/**
 * Polls up to BATCH_SIZE events per iteration.
 */
export const pollAndProcessOutboxEvents = async () => {
  let processedCount = 0;
  try {
    for (let i = 0; i < BATCH_SIZE; i++) {
      const claimed = await claimAndProcessNextEvent();
      if (!claimed) break; // No more eligible events right now
      processedCount++;
    }
  } catch (err) {
    logger.error({ err: err.message }, "[OutboxRelay] Polling loop error");
  }
  return processedCount;
};

export const startOutboxRelayWorker = () => {
  if (isRunning) return;
  isRunning = true;

  logger.info({ workerId: WORKER_ID }, "[OutboxRelay] Outbox relay worker started with atomic event claiming");

  const tick = async () => {
    if (!isRunning) return;
    await pollAndProcessOutboxEvents();
    if (isRunning) {
      timerId = setTimeout(tick, POLL_INTERVAL_MS);
    }
  };

  tick();
};

export const stopOutboxRelayWorker = () => {
  isRunning = false;
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
  }
  logger.info({ workerId: WORKER_ID }, "[OutboxRelay] Outbox relay worker stopped");
};
