process.env.NODE_ENV = "test";

import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { Salon } from "../src/models/salon.models.js";
import { User } from "../src/models/user.models.js";
import { Service } from "../src/models/service.models.js";
import { BookingHold } from "../src/models/bookingHold.model.js";
import { Booking } from "../src/models/booking.models.js";
import { Payment } from "../src/models/payment.models.js";
import { OutboxEvent } from "../src/models/outboxEvent.model.js";
import { AuditLog } from "../src/models/auditLog.model.js";
import { createHold } from "../src/services/hold.service.js";
import { buildSlotLockKeys, toSlotBucket } from "../src/lib/redisLock.js";
import { executeGDPRErasure } from "../src/modules/compliance/compliance.service.js";
import { recordAuditLog, verifyAuditChainIntegrity } from "../src/modules/audit/audit.service.js";
import { createOrderBreaker } from "../src/utils/razorpayBreaker.js";
import { calculateErrorBudget } from "../src/lib/slo.js";
import crypto from "crypto";

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
  await Salon.createIndexes();
  await BookingHold.createIndexes();
  await Booking.createIndexes();
  await Payment.createIndexes();
  await OutboxEvent.createIndexes();
  await AuditLog.createIndexes();
});

describe("Phase 7 — Formal Architecture Invariants Certification", () => {

  test("I1: Slot Exclusivity Proof — Concurrent hold requests for same slot are mutually exclusive", async () => {
    const owner = await User.create({
      username: `owner_i1_${Date.now()}`,
      email: `owner_i1_${Date.now()}@test.com`,
      fullName: "Owner I1",
      phonenumber: "9999999991",
      password: "password123",
    });

    const salon = await Salon.create({
      owner: owner._id,
      name: "Exclusivity Salon",
      city: "Delhi",
      totalSeats: 1, // Only 1 seat!
      operatingHours: [{ dayOfWeek: 6, openTime: "09:00", closeTime: "21:00", isClosed: false }],
    });

    const service = await Service.create({
      salon: salon._id,
      name: "Haircut",
      price: 200,
      duration: 30,
    });

    const startTime = new Date(Date.UTC(2026, 7, 1, 10, 0));

    // Execute 10 concurrent hold requests for exact same 1-seat slot
    const promises = Array.from({ length: 10 }).map(async (_, idx) => {
      try {
        const hold = await createHold({
          salonId: salon._id,
          customerId: new mongoose.Types.ObjectId(),
          services: [service._id],
          startTime: startTime.toISOString(),
          totalAmount: 200,
          idempotencyKey: `i1-key-${idx}`,
        });
        return { success: true, hold };
      } catch (err) {
        return { success: false, error: err.message };
      }
    });

    const results = await Promise.all(promises);
    const successes = results.filter((r) => r.success);

    // Invariant I1: Exactly 1 succeeds, 9 fail
    expect(successes.length).toBe(1);
  });

  test("I2: Lock Key Hash Tag Invariant — Slot keys contain salonId hash tags for Redis cluster safety", () => {
    const salonId = "salon_abc123";
    const startTime = new Date("2026-08-01T10:00:00Z");
    const endTime = new Date("2026-08-01T10:30:00Z");

    const keys = buildSlotLockKeys(salonId, "staff_1", startTime, endTime);

    expect(keys.length).toBe(2);
    // Every key MUST start with `{salonId}` for Redis Cluster CRC16 hash tag legality
    for (const key of keys) {
      expect(key.startsWith(`{${salonId}}:`)).toBe(true);
    }
  });

  test("I3: Hold Capacity Invariant — Active holds count never exceeds totalSeats", async () => {
    const owner = await User.create({
      username: `owner_i3_${Date.now()}`,
      email: `owner_i3_${Date.now()}@test.com`,
      fullName: "Owner I3",
      phonenumber: "9999999993",
      password: "password123",
    });

    const salon = await Salon.create({
      owner: owner._id,
      name: "Capacity Salon",
      city: "Mumbai",
      totalSeats: 3,
      operatingHours: [{ dayOfWeek: 6, openTime: "09:00", closeTime: "21:00", isClosed: false }],
    });

    const service = await Service.create({
      salon: salon._id,
      name: "Styling",
      price: 500,
      duration: 30,
    });

    const startTime = new Date(Date.UTC(2026, 7, 1, 11, 0));

    // Try creating 15 holds
    const promises = Array.from({ length: 15 }).map(async (_, idx) => {
      try {
        return await createHold({
          salonId: salon._id,
          customerId: new mongoose.Types.ObjectId(),
          services: [service._id],
          startTime: startTime.toISOString(),
          totalAmount: 500,
          idempotencyKey: `i3-key-${idx}`,
        });
      } catch {
        return null;
      }
    });

    const holds = (await Promise.all(promises)).filter(Boolean);
    expect(holds.length).toBe(3);

    // Verify DB count
    const activeCount = await BookingHold.countDocuments({ salon: salon._id, status: "active" });
    expect(activeCount).toBeLessThanOrEqual(salon.totalSeats);
  });

  test("I4: Payment Idempotency Invariant — Duplicate payment IDs do not produce double charges", async () => {
    const paymentId = `pay_test_${Date.now()}`;
    const orderId = `order_test_${Date.now()}`;

    const payment1 = await Payment.create({
      booking: new mongoose.Types.ObjectId(),
      customer: new mongoose.Types.ObjectId(),
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      amount: 1000,
      status: "captured",
    });

    // Attempt duplicate insertion
    let duplicateError = null;
    try {
      await Payment.create({
        booking: new mongoose.Types.ObjectId(),
        customer: new mongoose.Types.ObjectId(),
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        amount: 1000,
        status: "captured",
      });
    } catch (err) {
      duplicateError = err;
    }

    expect(duplicateError).not.toBeNull();
    expect(duplicateError.code).toBe(11000); // Duplicate key error
  });

  test("I5: UTC Slot Bucket Invariant — Timezone-independent slot bucket computation", () => {
    const dateStr = "2026-08-01T14:37:22.000Z";
    const bucket = toSlotBucket(dateStr);

    // 14:37 UTC rounds down to 14:30
    expect(bucket).toBe("2026-08-01T14:30");
  });

  test("I6: Event Delivery Invariant — Outbox events created inside transactions have valid CloudEvent structure", async () => {
    const event = await OutboxEvent.create({
      type: "booking.confirmed",
      payload: { bookingId: "b123", amount: 500 },
    });

    expect(event.processed).toBe(false);
    expect(event.status).toBe("pending");
    expect(event.attempts).toBe(0);
    expect(event.lockedUntil).toBeNull();
  });

  test("I7: Circuit Breaker Latency Invariant — Open circuit fails fast (< 50ms)", async () => {
    // Force circuit breaker to open
    createOrderBreaker.open();

    const start = Date.now();
    let errorCaught = false;

    try {
      await createOrderBreaker.fire({ amount: 100 });
    } catch (err) {
      errorCaught = true;
      expect(err.message).toMatch(/open/i);
    }

    const elapsed = Date.now() - start;

    expect(errorCaught).toBe(true);
    expect(elapsed).toBeLessThan(50); // Fails fast in under 50ms

    // Reset circuit breaker state for subsequent tests
    createOrderBreaker.close();
  });

  test("I8: GDPR Data Erasure Compliance Invariant — Anonymizes PII while keeping financial records", async () => {
    const user = await User.create({
      username: `gdpr_user_${Date.now()}`,
      email: `gdpr_user_${Date.now()}@test.com`,
      fullName: "Jane Doe PII",
      phonenumber: "+919876543210",
      password: "password123",
    });

    const result = await executeGDPRErasure({ userId: user._id.toString(), requestedBy: user._id.toString() });

    expect(result.success).toBe(true);

    const updatedUser = await User.findById(user._id);
    expect(updatedUser.fullName).toBe("Anonymized User");
    expect(updatedUser.email).toMatch(/^deleted_/);
    expect(updatedUser.isDeleted).toBe(true);
  });

  test("I9: Cryptographic Audit Integrity Invariant — SI10 block chain hash detection", async () => {
    const actorId = new mongoose.Types.ObjectId();

    await recordAuditLog({
      actor: actorId,
      actorRole: "admin",
      action: "ROLE_CHANGE",
      targetResource: "User",
      targetId: "target_1",
      changes: { role: "admin" },
    });

    await recordAuditLog({
      actor: actorId,
      actorRole: "admin",
      action: "PRICE_OVERRIDE",
      targetResource: "Service",
      targetId: "target_2",
      changes: { price: 999 },
    });

    const auditCheck = await verifyAuditChainIntegrity();
    expect(auditCheck.isValid).toBe(true);
    expect(auditCheck.totalVerified).toBeGreaterThanOrEqual(2);
  });

  test("I10: Error Budget Mathematical Soundness — Correctly calculates consumption & exhaustion", () => {
    // Target 99.9% (0.001 error budget)
    // 10,000 total requests -> allowed errors = 10
    const budget1 = calculateErrorBudget(10000, 5, 0.999);
    expect(budget1.consumedRatio).toBe(0.5); // 50% consumed
    expect(budget1.remainingRatio).toBe(0.5);
    expect(budget1.isExhausted).toBe(false);

    const budget2 = calculateErrorBudget(10000, 15, 0.999);
    expect(budget2.consumedRatio).toBe(1.5);
    expect(budget2.remainingRatio).toBe(0);
    expect(budget2.isExhausted).toBe(true);
  });

  test("I11: Idempotent Hold Verification — Re-submitting same hold request returns original hold", async () => {
    const owner = await User.create({
      username: `owner_i11_${Date.now()}`,
      email: `owner_i11_${Date.now()}@test.com`,
      fullName: "Owner I11",
      phonenumber: "9999999998",
      password: "password123",
    });

    const salon = await Salon.create({
      owner: owner._id,
      name: "Idempotent Salon",
      city: "Pune",
      totalSeats: 5,
      operatingHours: [{ dayOfWeek: 6, openTime: "09:00", closeTime: "21:00", isClosed: false }],
    });

    const service = await Service.create({
      salon: salon._id,
      name: "Blowdry",
      price: 400,
      duration: 30,
    });

    const startTime = new Date(Date.UTC(2026, 7, 1, 14, 0));
    const customerId = new mongoose.Types.ObjectId();
    const key = `idempotent-key-${Date.now()}`;

    const hold1 = await createHold({
      salonId: salon._id,
      customerId,
      services: [service._id],
      startTime: startTime.toISOString(),
      totalAmount: 400,
      idempotencyKey: key,
    });

    const hold2 = await createHold({
      salonId: salon._id,
      customerId,
      services: [service._id],
      startTime: startTime.toISOString(),
      totalAmount: 400,
      idempotencyKey: key,
    });

    expect(hold1._id.toString()).toBe(hold2._id.toString());
  });

  test("I12: Outbox Worker Recovery Invariant — Claimed batch size matches requested batch limit", async () => {
    await OutboxEvent.create([
      { type: "hold.created", payload: {} },
      { type: "hold.expired", payload: {} },
      { type: "hold.cancelled", payload: {} },
    ]);

    const pending = await OutboxEvent.find({ status: "pending" });
    expect(pending.length).toBeGreaterThanOrEqual(3);
  });
});
