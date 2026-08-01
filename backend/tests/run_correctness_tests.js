process.env.NODE_ENV = "test";

import mongoose from "mongoose";
import crypto from "crypto";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { acquireSlotLock, releaseSlotLock, buildSlotLockKeys } from "../src/lib/redisLock.js";
import { withIdempotency } from "../src/services/idempotency.service.js";
import { confirmPaymentAndBooking } from "../src/services/payment.service.js";
import { OutboxEvent } from "../src/models/outboxEvent.model.js";
import { IdempotencyRecord } from "../src/models/idempotencyRecord.model.js";
import { WebhookEvent } from "../src/models/webhookEvent.model.js";
import { Booking } from "../src/models/booking.models.js";
import { BookingHold } from "../src/models/bookingHold.model.js";
import { Payment } from "../src/models/payment.models.js";
import { Salon } from "../src/models/salon.models.js";
import { pollAndProcessOutboxEvents, claimAndProcessNextEvent } from "../src/workers/outboxRelay.worker.js";
import { setMockRedisClient } from "../src/lib/redis.js";
import logger from "../src/lib/logger.js";

logger.level = "error";

// ── In-Memory Redis Mock for standalone test execution ─────────────────────
class InMemoryRedis {
  constructor() {
    this.store = new Map();
    this.sets = new Map();
  }

  async set(key, value, ...args) {
    const nx = args.includes("NX");
    if (nx && this.store.has(key)) {
      return null;
    }
    this.store.set(key, String(value));
    return "OK";
  }

  async get(key) {
    return this.store.get(key) || null;
  }

  async del(...keys) {
    let count = 0;
    for (const k of keys.flat()) {
      if (this.store.delete(k)) count++;
      if (this.sets.delete(k)) count++;
    }
    return count;
  }

  async eval(script, numKeys, ...args) {
    const keys = args.slice(0, numKeys);
    const scriptArgs = args.slice(numKeys);

    if (script.includes('redis.call("DEL", KEYS[1])')) {
      const key = keys[0];
      const token = scriptArgs[0];
      if (this.store.get(key) === token) {
        this.store.delete(key);
        return 1;
      }
      return 0;
    }

    if (script.includes('redis.call("PEXPIRE", key, ARGV[2])')) {
      const token = scriptArgs[0];
      let extended = 0;
      for (const k of keys) {
        if (this.store.get(k) === token) {
          extended++;
        }
      }
      return extended;
    }

    return 0;
  }

  async sadd(key, ...members) {
    if (!this.sets.has(key)) this.sets.set(key, new Set());
    const set = this.sets.get(key);
    let added = 0;
    for (const m of members) {
      if (!set.has(m)) {
        set.add(m);
        added++;
      }
    }
    return added;
  }

  async smembers(key) {
    const set = this.sets.get(key);
    return set ? Array.from(set) : [];
  }

  async ttl(key) {
    return this.store.has(key) ? 60 : -2;
  }

  async expire(key, seconds) {
    return 1;
  }

  pipeline() {
    const self = this;
    const commands = [];
    return {
      del(k) {
        commands.push(() => self.del(k));
        return this;
      },
      async exec() {
        for (const cmd of commands) await cmd();
        return [];
      },
    };
  }

  async scan(cursor, ...args) {
    return ["0", Array.from(this.store.keys())];
  }
}

const mockRedis = new InMemoryRedis();
setMockRedisClient(mockRedis);

const runSuite = async () => {
  console.log("\n=======================================================");
  console.log("  SALONNOW PHASE 1 CORRECTNESS INVARIANT TEST SUITE    ");
  console.log("=======================================================\n");

  let mongod = null;
  try {
    mongod = await MongoMemoryReplSet.create({
      replSet: { count: 1 },
    });
    const mongoUri = mongod.getUri();
    await mongoose.connect(mongoUri);
    console.log("✓ Connected to In-Memory MongoDB");
  } catch (err) {
    console.error("❌ MongoMemoryServer failed:", err.message);
    process.exit(1);
  }

  let passedTests = 0;
  let failedTests = 0;

  const assert = (condition, testName, failureMsg) => {
    if (condition) {
      console.log(`  ✓ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.log(`  ❌ [FAIL] ${testName} — ${failureMsg}`);
      failedTests++;
    }
  };

  try {
    const testSalon = await Salon.create({
      name: "Test Correctness Salon",
      city: "TestCity",
      state: "TestState",
      pincode: "123456",
      totalSeats: 1,
      owner: new mongoose.Types.ObjectId(),
    });

    const salonId = testSalon._id.toString();
    const startTime = new Date(Date.UTC(2026, 7, 10, 14, 0, 0));
    const endTime = new Date(Date.UTC(2026, 7, 10, 14, 30, 0));

    // ───────────────────────────────────────────────────────────────────────
    // TEST 1: 100 Concurrent Slot Lock Acquisitions for 1 Seat
    // ───────────────────────────────────────────────────────────────────────
    console.log("\n[Test 1] 100 Concurrent Slot Lock Acquisitions for 1 Seat Slot (I1)");
    const lockKeys = buildSlotLockKeys(salonId, "staff1", startTime, endTime);

    const lockResults = await Promise.all(
      Array.from({ length: 100 }, () => acquireSlotLock(lockKeys, 5000))
    );

    const successfulAcquisitions = lockResults.filter((r) => r.acquired);
    const failedAcquisitions = lockResults.filter((r) => !r.acquired);

    assert(
      successfulAcquisitions.length === 1 && failedAcquisitions.length === 99,
      "100 Concurrent Slot Lock Acquisitions",
      `Expected 1 success and 99 failures, but got ${successfulAcquisitions.length} successes`
    );

    if (successfulAcquisitions.length > 0) {
      const { keys, token, stopWatchdog } = successfulAcquisitions[0];
      await releaseSlotLock(keys, token, stopWatchdog);
    }

    // ───────────────────────────────────────────────────────────────────────
    // TEST 2: Idempotency Key Reuse Payload Mismatch (HTTP 422 - Item 4)
    // ───────────────────────────────────────────────────────────────────────
    console.log("\n[Test 2] Idempotency Key Reuse Payload Mismatch Rejection (HTTP 422)");
    const idemKey = "test_key_mismatch_123";

    await withIdempotency(
      idemKey,
      "hold",
      { slot: "14:00", customer: "cust1" },
      false,
      async () => ({ statusCode: 201, body: { holdId: "hold_1" } })
    );

    let caught422 = false;
    try {
      await withIdempotency(
        idemKey,
        "hold",
        { slot: "15:00", customer: "cust2" },
        false,
        async () => ({ statusCode: 201, body: { holdId: "hold_2" } })
      );
    } catch (err) {
      if (err.statusCode === 422 || err.code === "ERR_422") {
        caught422 = true;
      }
    }

    assert(
      caught422,
      "Idempotency Key Reuse Payload Mismatch Rejection (HTTP 422)",
      "Expected HTTP 422 error on mismatched payload reuse"
    );

    // ───────────────────────────────────────────────────────────────────────
    // TEST 3: Duplicate Webhook Flood Event Deduplication (I8)
    // ───────────────────────────────────────────────────────────────────────
    console.log("\n[Test 3] Duplicate Webhook Flood Event Deduplication (I8)");
    const eventId = "evt_razorpay_flood_999";

    const webhookInserts = await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        WebhookEvent.create({
          razorpayEventId: eventId,
          eventType: "payment.captured",
          payload: { id: eventId },
        })
      )
    );

    const insertedDocs = webhookInserts.filter((r) => r.status === "fulfilled");
    const duplicateRejections = webhookInserts.filter(
      (r) => r.status === "rejected" && r.reason?.code === 11000
    );

    assert(
      insertedDocs.length === 1 && duplicateRejections.length === 9,
      "Duplicate Webhook Flood Deduplication",
      `Expected 1 insert and 9 duplicate key rejections, got ${insertedDocs.length} inserts`
    );

    // ───────────────────────────────────────────────────────────────────────
    // TEST 4: Client Verify vs Webhook Race Convergence (I3, I4)
    // ───────────────────────────────────────────────────────────────────────
    console.log("\n[Test 4] Client Verify vs Webhook Race Convergence (I3, I4)");
    const testCustomerId = new mongoose.Types.ObjectId();
    const testBooking = await Booking.create({
      customer: testCustomerId,
      salon: testSalon._id,
      services: [new mongoose.Types.ObjectId()],
      totalAmount: 500,
      status: "pending_payment",
      paymentStatus: "pending",
      startTime,
      endTime,
    });

    const testPayment = await Payment.create({
      booking: testBooking._id,
      customer: testCustomerId,
      razorpayOrderId: "order_race_test_1",
      amount: 500,
      currency: "INR",
      status: "created",
    });

    const raceResults = await Promise.all([
      confirmPaymentAndBooking({
        bookingId: testBooking._id.toString(),
        razorpayOrderId: testPayment.razorpayOrderId,
        razorpayPaymentId: "pay_race_123",
        source: "client",
      }),
      confirmPaymentAndBooking({
        bookingId: testBooking._id.toString(),
        razorpayOrderId: testPayment.razorpayOrderId,
        razorpayPaymentId: "pay_race_123",
        source: "webhook",
      }),
    ]);

    const confirmedDoc = await Booking.findById(testBooking._id);
    const outboxEvents = await OutboxEvent.find({
      type: "booking.confirmed",
      "payload.bookingId": testBooking._id.toString(),
    });

    const hasNewConfirm = raceResults.some((r) => r.alreadyConfirmed === false);
    const hasCachedConfirm = raceResults.some((r) => r.alreadyConfirmed === true);

    assert(
      confirmedDoc.status === "confirmed" &&
        confirmedDoc.paymentStatus === "paid" &&
        hasNewConfirm &&
        hasCachedConfirm &&
        outboxEvents.length === 1,
      "Client Verify vs Webhook Race Convergence",
      `Expected booking confirmed once with 1 outbox event. Outbox count: ${outboxEvents.length}`
    );

    // ───────────────────────────────────────────────────────────────────────
    // TEST 5: Poison Outbox Event Isolation & Dead Letter Queue (Item 6)
    // ───────────────────────────────────────────────────────────────────────
    console.log("\n[Test 5] Poison Event Isolation & Dead Letter Queue (Item 6)");

    const [poisonEvent] = await OutboxEvent.create([
      {
        type: "hold.created",
        payload: { forceError: true }, // missing required date/salon fields -> forces handler exception
        status: "pending",
        processed: false,
        attempts: 4,
      },
    ]);

    const [validEvent] = await OutboxEvent.create([
      {
        type: "salon.hours_changed",
        payload: { salonId: testSalon._id.toString() },
        status: "pending",
        processed: false,
        attempts: 0,
      },
    ]);

    await pollAndProcessOutboxEvents();

    const updatedPoison = await OutboxEvent.findById(poisonEvent._id);
    const updatedValid = await OutboxEvent.findById(validEvent._id);

    assert(
      updatedPoison.status === "dead_letter" &&
        updatedPoison.attempts === 5 &&
        updatedValid.status === "processed" &&
        updatedValid.processed === true,
      "Poison Event Isolation & Dead Letter Queue",
      `Poison status: ${updatedPoison.status}, Valid status: ${updatedValid.status}`
    );

    // ───────────────────────────────────────────────────────────────────────
    // TEST 6: Redis Lock Renewal Watchdog Mechanism (Item 1)
    // ───────────────────────────────────────────────────────────────────────
    console.log("\n[Test 6] Redis Lock Renewal Watchdog Mechanism (Item 1)");
    const watchdogKeys = buildSlotLockKeys(salonId, "staff2", startTime, endTime);

    const lockWithWatchdog = await acquireSlotLock(watchdogKeys, 5000);
    assert(lockWithWatchdog.acquired, "Acquired slot lock with watchdog", "Failed to acquire lock");

    const secondCaller = await acquireSlotLock(watchdogKeys, 5000);
    assert(
      !secondCaller.acquired,
      "Second caller rejected while lock is active",
      "Lock was erroneously acquired by second caller"
    );

    await releaseSlotLock(lockWithWatchdog.keys, lockWithWatchdog.token, lockWithWatchdog.stopWatchdog);

    // ───────────────────────────────────────────────────────────────────────
    // TEST 7: Multi-Instance Outbox Worker Claim Isolation (Item 2)
    // ───────────────────────────────────────────────────────────────────────
    console.log("\n[Test 7] Multi-Instance Outbox Worker Lease Claim Isolation (Item 2)");
    const [multiEvent] = await OutboxEvent.create([
      {
        type: "salon.hours_changed",
        payload: { salonId: testSalon._id.toString() },
        status: "pending",
        processed: false,
        attempts: 0,
      },
    ]);

    const claimedByWorkerA = await claimAndProcessNextEvent();
    const claimedByWorkerB = await claimAndProcessNextEvent();

    assert(
      claimedByWorkerA === true && claimedByWorkerB === false,
      "Multi-Instance Outbox Worker Lease Claiming",
      "Worker B was able to claim the event simultaneously with Worker A"
    );
  } catch (err) {
    console.error("❌ Test suite encountered unhandled error:", err);
    failedTests++;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    if (mongod) {
      await mongod.stop();
    }
  }

  console.log("\n=======================================================");
  console.log(`  SUITE SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log("=======================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
};

runSuite();
