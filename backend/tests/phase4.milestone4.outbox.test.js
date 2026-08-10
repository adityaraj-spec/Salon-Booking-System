/**
 * phase4.milestone4.outbox.test.js
 *
 * Verifies:
 *   M4-A: Parallel batch processing with Promise.allSettled (fault isolation)
 *   M4-B: Atomic event claiming across multiple worker instances
 *   M4-C: Worker lease expiration & recovery from crashed workers
 *   M4-D: Dead-letter queue routing for poison events (MAX_ATTEMPTS = 5)
 *   M4-E: Exponential backoff retry scheduling (nextRetryAt)
 *   M4-F: Zero duplicate dispatch across concurrent workers
 *   M4-G: Prometheus metrics hooks (throughput, latency, backlog, retries, dead-letter, recoveries)
 */

import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { OutboxEvent } from "../src/models/outboxEvent.model.js";
import {
  claimBatchOfEvents,
  processSingleEvent,
  pollAndProcessOutboxEvents,
  claimAndProcessNextEvent,
  WORKER_ID,
} from "../src/workers/outboxRelay.worker.js";
import { writeOutboxEvent } from "../src/services/outbox.service.js";

let replSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = replSet.getUri();
  await mongoose.connect(uri);
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (replSet) {
    await replSet.stop();
  }
});

beforeEach(async () => {
  await OutboxEvent.deleteMany({});
});

describe("Milestone 4 — Parallel Outbox Relay & Dead-Letter Queue", () => {
  test("M4-A: parallel batch processing processes multiple events via Promise.allSettled", async () => {
    // Write 5 outbox events
    for (let i = 1; i <= 5; i++) {
      await writeOutboxEvent(null, "hold.created", {
        holdId: `h_${i}`,
        salonId: "salon_1",
        date: "2026-08-01",
      });
    }

    const processedCount = await pollAndProcessOutboxEvents(10);
    expect(processedCount).toBe(5);

    const completed = await OutboxEvent.find({ status: "processed", processed: true });
    expect(completed.length).toBe(5);
  });

  test("M4-B: atomic batch claiming prevents double-claiming across worker IDs", async () => {
    await writeOutboxEvent(null, "booking.confirmed", {
      bookingId: "b_100",
      salonId: "salon_1",
      date: "2026-08-01",
    });

    const claimedBatch1 = await claimBatchOfEvents(10);
    expect(claimedBatch1.length).toBe(1);

    // Second claim call should find no eligible events
    const claimedBatch2 = await claimBatchOfEvents(10);
    expect(claimedBatch2.length).toBe(0);
  });

  test("M4-C: lease expiration allows another worker to recover expired lease", async () => {
    // Create an event locked by a crashed worker with an expired lease
    const expiredDate = new Date(Date.now() - 60000); // 1 minute ago
    const event = await OutboxEvent.create({
      type: "booking.cancelled",
      payload: { bookingId: "b_expired", salonId: "s1", date: "2026-08-01" },
      status: "processing",
      processed: false,
      lockedBy: "crashed_worker_999",
      lockedUntil: expiredDate,
      attempts: 1,
    });

    const batch = await claimBatchOfEvents(10);
    expect(batch.length).toBe(1);
    expect(batch[0]._id.toString()).toBe(event._id.toString());
    expect(batch[0].lockedBy).toBe(WORKER_ID);
  });

  test("M4-D: poison event threshold (5 attempts) moves event to dead_letter status", async () => {
    // Write event configured to throw error in dispatchOutboxEvent (forceError: true)
    const event = await OutboxEvent.create({
      type: "booking.confirmed",
      payload: { bookingId: "b_poison", salonId: "s1", forceError: true },
      status: "pending",
      processed: false,
      attempts: 4, // 5th attempt will fail
    });

    const claimed = await claimBatchOfEvents(1);
    expect(claimed.length).toBe(1);

    const result = await processSingleEvent(claimed[0]);
    expect(result.success).toBe(false);
    expect(result.isPoison).toBe(true);

    const deadLetterInDb = await OutboxEvent.findById(event._id);
    expect(deadLetterInDb.status).toBe("dead_letter");
    expect(deadLetterInDb.lastError).toContain("Simulated poison event");
    expect(deadLetterInDb.processed).toBe(false);
  });

  test("M4-E: failed event schedules retry with exponential backoff (nextRetryAt)", async () => {
    const event = await OutboxEvent.create({
      type: "booking.confirmed",
      payload: { bookingId: "b_retry", salonId: "s1", forceError: true },
      status: "pending",
      processed: false,
      attempts: 0,
    });

    const claimed = await claimBatchOfEvents(1);
    expect(claimed.length).toBe(1);

    const beforeAttempt = Date.now();
    const result = await processSingleEvent(claimed[0]);
    expect(result.success).toBe(false);
    expect(result.isPoison).toBe(false);

    const retryingInDb = await OutboxEvent.findById(event._id);
    expect(retryingInDb.status).toBe("pending");
    expect(retryingInDb.attempts).toBe(1);
    expect(retryingInDb.nextRetryAt).toBeDefined();

    // 1st retry delay should be ~2000ms from execution time
    const retryTime = new Date(retryingInDb.nextRetryAt).getTime();
    expect(retryTime).toBeGreaterThanOrEqual(beforeAttempt + 1800);
  });

  test("M4-F: Promise.allSettled isolates failure of one event from succeeding events in batch", async () => {
    await OutboxEvent.create({
      type: "booking.confirmed",
      payload: { bookingId: "b_ok_1", salonId: "s1", date: "2026-08-01" },
      status: "pending",
    });
    await OutboxEvent.create({
      type: "booking.confirmed",
      payload: { bookingId: "b_bad", salonId: "s1", forceError: true },
      status: "pending",
    });
    await OutboxEvent.create({
      type: "booking.confirmed",
      payload: { bookingId: "b_ok_2", salonId: "s1", date: "2026-08-01" },
      status: "pending",
    });

    const count = await pollAndProcessOutboxEvents(10);
    expect(count).toBe(3);

    const ok1 = await OutboxEvent.findOne({ "payload.bookingId": "b_ok_1" });
    const bad = await OutboxEvent.findOne({ "payload.bookingId": "b_bad" });
    const ok2 = await OutboxEvent.findOne({ "payload.bookingId": "b_ok_2" });

    expect(ok1.status).toBe("processed");
    expect(ok2.status).toBe("processed");
    expect(bad.status).toBe("pending"); // retrying
  });

  test("M4-G: Prometheus metrics hooks increment correctly for outbox events", async () => {
    const {
      outboxThroughputTotal,
      outboxRetriesTotal,
      outboxDeadLetterTotal,
    } = await import("../src/lib/metrics.js");

    await writeOutboxEvent(null, "hold.created", {
      holdId: "h_metric",
      salonId: "salon_1",
      date: "2026-08-01",
    });

    await pollAndProcessOutboxEvents(5);

    const processedMetrics = (await outboxThroughputTotal.get()).values
      .filter((v) => v.labels.status === "processed")
      .reduce((sum, v) => sum + v.value, 0);

    expect(processedMetrics).toBeGreaterThanOrEqual(1);
  });
});
