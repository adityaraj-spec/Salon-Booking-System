process.env.NODE_ENV = "test";

import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { OutboxEvent } from "../src/models/outboxEvent.model.js";
import { claimBatchOfEvents, processSingleEvent } from "../src/workers/outboxRelay.worker.js";
import { createOrderBreaker } from "../src/utils/razorpayBreaker.js";
import { acquireSlotLock } from "../src/lib/redisLock.js";
import { waitForHttpRequestsToDrain, setShuttingDown, getLifecycleState } from "../src/lib/lifecycle.js";

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
  await mongoose.connection.db.dropDatabase();
  await OutboxEvent.createIndexes();
});

describe("Phase 7 — Chaos Engineering & Failure Injection Certification", () => {

  test("Chaos 1: Worker Lease Crash Recovery — Expired leases from crashed workers are cleanly recovered", async () => {
    const pastLease = new Date(Date.now() - 60000); // Expired 60s ago

    const abandonedEvent = await OutboxEvent.create({
      type: "hold.expired",
      payload: { test: true },
      status: "processing",
      lockedBy: "worker_crashed_999",
      lockedUntil: pastLease,
      attempts: 1,
    });

    // Claim batch with current active worker
    const claimed = await claimBatchOfEvents(10);

    expect(claimed.length).toBe(1);
    expect(claimed[0]._id.toString()).toBe(abandonedEvent._id.toString());
    expect(claimed[0].lockedBy).not.toBe("worker_crashed_999");
  });

  test("Chaos 2: Concurrent Worker Batch Claim Race — Two parallel workers claim disjoint event sets", async () => {
    // Create 10 pending events
    const events = Array.from({ length: 10 }).map((_, idx) => ({
      type: "booking.confirmed",
      payload: { index: idx },
    }));
    await OutboxEvent.create(events);

    // Simulate Worker A and Worker B claiming concurrently by passing distinct workerIds
    const claimA = claimBatchOfEvents(5, "worker_alpha");
    const claimB = claimBatchOfEvents(5, "worker_beta");

    const [batchA, batchB] = await Promise.all([claimA, claimB]);

    const idsA = new Set(batchA.map((e) => e._id.toString()));
    const idsB = new Set(batchB.map((e) => e._id.toString()));

    // Verify ZERO overlap (disjoint sets)
    let overlapCount = 0;
    for (const id of idsA) {
      if (idsB.has(id)) overlapCount++;
    }

    expect(overlapCount).toBe(0);
    expect(batchA.length + batchB.length).toBeLessThanOrEqual(10);
  });

  test("Chaos 3: Poison Event Dead-Letter Escalation — Event reaching MAX_ATTEMPTS is routed to dead_letter", async () => {
    // forceError: true triggers dispatchOutboxEvent to throw (see outbox.service.js:23)
    // attempts: 5 ensures isPoison === true in the catch block (MAX_ATTEMPTS = 5)
    const poisonEvent = await OutboxEvent.create({
      type: "booking.confirmed",
      payload: { forceError: true },
      attempts: 5,
      status: "processing",
    });

    const result = await processSingleEvent(poisonEvent);

    expect(result.success).toBe(false);
    expect(result.isPoison).toBe(true);

    const updated = await OutboxEvent.findById(poisonEvent._id);
    expect(updated.status).toBe("dead_letter");
    expect(updated.processed).toBe(false);
  });

  test("Chaos 4: Circuit Breaker Failure Surge Injection — OPEN state fast-fails calls", async () => {
    createOrderBreaker.open();

    let rejectedFast = false;
    try {
      await createOrderBreaker.fire({ amount: 500 });
    } catch (err) {
      rejectedFast = err.message.includes("open") || err.name.includes("Open");
    }

    expect(rejectedFast).toBe(true);

    // Reset circuit breaker
    createOrderBreaker.close();
  });

  test("Chaos 5: Lock Service Failure Handling — Test mode acquisition returns lock token correctly", async () => {
    const keys = ["{salon_test}:lock:hold:staff1:2026-08-01T10:00"];
    const lockResult = await acquireSlotLock(keys, 5000);

    expect(lockResult.acquired).toBe(true);
    expect(lockResult.token).toBeDefined();

    if (typeof lockResult.stopWatchdog === "function") {
      lockResult.stopWatchdog();
    }
  });

  test("Chaos 6: Graceful Shutdown Drain — In-flight request counters track drain status correctly", async () => {
    setShuttingDown(true);

    const stateBefore = getLifecycleState();
    expect(stateBefore.isShuttingDown).toBe(true);
    expect(stateBefore.isAppReady).toBe(false);

    const drainPromise = waitForHttpRequestsToDrain(500);
    const drained = await drainPromise;

    expect(drained).toBe(true);

    // Reset lifecycle
    setShuttingDown(false);
  });
});
