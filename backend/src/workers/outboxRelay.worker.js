import { OutboxEvent } from "../models/outboxEvent.model.js";
import { dispatchOutboxEvent } from "../services/outbox.service.js";
import logger from "../lib/logger.js";
import {
  outboxThroughputTotal,
  outboxProcessingLatencySeconds,
  outboxQueueBacklog,
  outboxRetriesTotal,
  outboxDeadLetterTotal,
  outboxLeaseRecoveriesTotal,
} from "../lib/metrics.js";

const POLL_INTERVAL_MS = parseInt(process.env.OUTBOX_POLL_INTERVAL_MS || "1000", 10);
const BATCH_SIZE = parseInt(process.env.OUTBOX_BATCH_SIZE || "25", 10);
const LEASE_DURATION_MS = parseInt(process.env.OUTBOX_LEASE_MS || "30000", 10); // 30s worker lease
const MAX_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 2000; // 2s base exponential backoff

export const WORKER_ID = process.env.WORKER_ID || `worker_${process.pid}_${Math.random().toString(36).slice(2, 7)}`;
let isRunning = false;
let timerId = null;

/**
 * Atomically claims a batch of unprocessed or lease-expired OutboxEvents in MongoDB.
 * Ensures zero duplicate processing across horizontally scaled worker replicas (Milestone 4).
 *
 * @param {number} batchSize - max events to claim in single batch (default: 25)
 * @returns {Promise<Array<object>>} Array of claimed OutboxEvent documents
 */
export const claimBatchOfEvents = async (batchSize = BATCH_SIZE) => {
  const now = new Date();
  const leaseExpiration = new Date(now.getTime() + LEASE_DURATION_MS);

  // 1. Find eligible candidate events
  const candidates = await OutboxEvent.find({
    processed: false,
    status: { $nin: ["dead_letter", "processed"] },
    attempts: { $lt: MAX_ATTEMPTS },
    $or: [
      { nextRetryAt: null },
      { nextRetryAt: { $lte: now } },
    ],
    $or: [
      { lockedUntil: null },
      { lockedUntil: { $lt: now } },
    ],
  })
    .sort({ createdAt: 1 })
    .limit(batchSize)
    .select("_id lockedUntil lockedBy status attempts")
    .lean();

  if (!candidates || candidates.length === 0) {
    return [];
  }

  // 2. Lease recovery check: detect and log expired leases from crashed workers
  const expiredLeases = candidates.filter((c) => c.lockedUntil && new Date(c.lockedUntil) < now);
  for (const expired of expiredLeases) {
    try { outboxLeaseRecoveriesTotal.inc(); } catch {}
    logger.warn(
      { eventId: expired._id, previousWorker: expired.lockedBy, expiredAt: expired.lockedUntil, workerId: WORKER_ID },
      "[OutboxRelay] Worker lease recovered from crashed or timed-out worker"
    );
  }

  const candidateIds = candidates.map((c) => c._id);

  // 3. Atomic batch claim via updateMany
  await OutboxEvent.updateMany(
    {
      _id: { $in: candidateIds },
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
    }
  );

  // 4. Fetch the documents successfully claimed by THIS worker instance
  const claimedEvents = await OutboxEvent.find({
    _id: { $in: candidateIds },
    lockedBy: WORKER_ID,
    status: "processing",
  });

  for (const event of claimedEvents) {
    logger.debug(
      { eventId: event._id, type: event.type, workerId: WORKER_ID, attempt: event.attempts },
      "[OutboxRelay] Event claimed"
    );
  }

  return claimedEvents;
};

/**
 * Processes a single outbox event with latency tracking, exponential backoff retries,
 * and dead-letter queue routing for poison events (Milestone 4).
 *
 * @param {object} event - OutboxEvent document
 * @returns {Promise<{ success: boolean, eventId: string, error?: string, isPoison?: boolean }>}
 */
export const processSingleEvent = async (event) => {
  const startHr = process.hrtime.bigint();

  try {
    // Execute domain event handler (availability invalidation, websocket notification)
    await dispatchOutboxEvent(event);

    const durationSec = Number(process.hrtime.bigint() - startHr) / 1e9;

    // Mark processed successfully
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
          nextRetryAt: null,
        },
      }
    );

    try {
      outboxProcessingLatencySeconds.observe(durationSec);
      outboxThroughputTotal.inc({ status: "processed" });
    } catch {}

    logger.debug(
      { eventId: event._id, type: event.type, durationMs: durationSec * 1000 },
      "[OutboxRelay] Event processed successfully"
    );

    return { success: true, eventId: event._id.toString() };
  } catch (err) {
    const durationSec = Number(process.hrtime.bigint() - startHr) / 1e9;
    const isPoison = event.attempts >= MAX_ATTEMPTS;

    if (isPoison) {
      // ── Poison Event -> Dead-Letter Queue ────────────────────────────────
      await OutboxEvent.updateOne(
        { _id: event._id },
        {
          $set: {
            status: "dead_letter",
            lastError: err.message,
            nextRetryAt: null,
            lockedBy: null,
            lockedUntil: null,
          },
        }
      ).catch((e) => logger.warn({ e: e.message }, "[OutboxRelay] Failed to update dead-letter status"));

      try {
        outboxDeadLetterTotal.inc();
        outboxThroughputTotal.inc({ status: "dead_letter" });
      } catch {}

      logger.error(
        { eventId: event._id, type: event.type, attempts: event.attempts, err: err.message },
        "[OutboxRelay] Event dead-lettered — poison event threshold reached"
      );

      return { success: false, eventId: event._id.toString(), error: err.message, isPoison: true };
    } else {
      // ── Retry with Exponential Backoff ───────────────────────────────────
      const backoffMs = BASE_BACKOFF_MS * Math.pow(2, event.attempts - 1);
      const nextRetryAt = new Date(Date.now() + backoffMs);

      await OutboxEvent.updateOne(
        { _id: event._id },
        {
          $set: {
            status: "pending",
            lastError: err.message,
            nextRetryAt,
            lockedBy: null,
            lockedUntil: null,
          },
        }
      ).catch((e) => logger.warn({ e: e.message }, "[OutboxRelay] Failed to update retry status"));

      try {
        outboxRetriesTotal.inc();
        outboxThroughputTotal.inc({ status: "failed" });
      } catch {}

      logger.warn(
        {
          eventId: event._id,
          type: event.type,
          attempts: event.attempts,
          err: err.message,
          nextRetryAt,
          backoffMs,
        },
        "[OutboxRelay] Event retried — scheduled with exponential backoff"
      );

      return { success: false, eventId: event._id.toString(), error: err.message, isPoison: false };
    }
  }
};

/**
 * Claims single event for backward compatibility with single-event test runners.
 */
export const claimAndProcessNextEvent = async () => {
  const events = await claimBatchOfEvents(1);
  if (!events || events.length === 0) return false;

  const result = await processSingleEvent(events[0]);
  return result.success;
};

/**
 * Polls and processes outbox events in PARALLEL batches using Promise.allSettled().
 * Unblocks high-throughput worker pipelines while isolating individual event failures (Milestone 4).
 *
 * @param {number} [batchSize] - optional override batch size
 * @returns {Promise<number>} Number of events claimed and processed in batch
 */
export const pollAndProcessOutboxEvents = async (batchSize = BATCH_SIZE) => {
  let processedCount = 0;

  try {
    const events = await claimBatchOfEvents(batchSize);
    if (!events || events.length === 0) {
      return 0;
    }

    // Process entire batch in PARALLEL — one slow/failed event won't block others (Promise.allSettled)
    const results = await Promise.allSettled(events.map((event) => processSingleEvent(event)));

    const succeeded = results.filter((r) => r.status === "fulfilled" && r.value.success).length;
    const failed = results.length - succeeded;
    processedCount = events.length;

    logger.info(
      { workerId: WORKER_ID, batchSize: events.length, succeeded, failed },
      "[OutboxRelay] Parallel batch processed"
    );

    // Update backlog metric gauge asynchronously
    OutboxEvent.countDocuments({ processed: false, status: { $ne: "dead_letter" } })
      .then((backlog) => {
        try { outboxQueueBacklog.set(backlog); } catch {}
      })
      .catch(() => {});
  } catch (err) {
    logger.error({ err: err.message, workerId: WORKER_ID }, "[OutboxRelay] Polling loop error");
  }

  return processedCount;
};

export const startOutboxRelayWorker = () => {
  if (isRunning) return;
  isRunning = true;

  logger.info(
    { workerId: WORKER_ID, batchSize: BATCH_SIZE, pollIntervalMs: POLL_INTERVAL_MS },
    "[OutboxRelay] Parallel outbox relay worker started with atomic batch claiming and dead-letter queue support"
  );

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

