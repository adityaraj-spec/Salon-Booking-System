import { OutboxEvent } from "../models/outboxEvent.model.js";
import { dispatchOutboxEvent } from "../services/outbox.service.js";
import logger from "../lib/logger.js";

const POLL_INTERVAL_MS = 2000; // 2 seconds
const BATCH_SIZE = 50;

let isRunning = false;
let timerId = null;

/**
 * Single polling pass — finds unprocessed OutboxEvents and dispatches them.
 * At-least-once processing guarantee (I5, I10).
 */
export const pollAndProcessOutboxEvents = async () => {
  try {
    const events = await OutboxEvent.find({ processed: false })
      .sort({ createdAt: 1 })
      .limit(BATCH_SIZE)
      .lean();

    if (events.length === 0) return 0;

    logger.debug({ count: events.length }, "[OutboxRelay] Processing batch of outbox events");

    let processedCount = 0;
    for (const event of events) {
      try {
        await dispatchOutboxEvent(event);
        processedCount++;
      } catch (err) {
        logger.error({ eventId: event._id, type: event.type, err: err.message }, "[OutboxRelay] Event processing failed");
      }
    }

    return processedCount;
  } catch (err) {
    logger.error({ err: err.message }, "[OutboxRelay] Polling loop error");
    return 0;
  }
};

/**
 * Starts the OutboxRelay background worker loop.
 */
export const startOutboxRelayWorker = () => {
  if (isRunning) return;
  isRunning = true;

  logger.info("[OutboxRelay] Outbox relay worker started");

  const tick = async () => {
    if (!isRunning) return;
    await pollAndProcessOutboxEvents();
    if (isRunning) {
      timerId = setTimeout(tick, POLL_INTERVAL_MS);
    }
  };

  tick();
};

/**
 * Stops the OutboxRelay worker loop.
 */
export const stopOutboxRelayWorker = () => {
  isRunning = false;
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
  }
  logger.info("[OutboxRelay] Outbox relay worker stopped");
};
