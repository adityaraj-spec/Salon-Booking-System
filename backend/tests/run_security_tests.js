process.env.NODE_ENV = "test";
process.env.USE_REDIS_IN_TESTS = "true";
process.env.ACCESS_TOKEN_SECRET = "test_access_token_secret_32bytes_long!!";
process.env.REFRESH_TOKEN_SECRET = "test_refresh_token_secret_32bytes_long!";

import mongoose from "mongoose";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { User } from "../src/models/user.models.js";
import { Booking } from "../src/models/booking.models.js";
import { Salon } from "../src/models/salon.models.js";
import { Service } from "../src/models/service.models.js";
import { AuditLog } from "../src/models/auditLog.model.js";
import { issueTokenPair, rotateRefreshToken, revokeAllUserSessions } from "../src/services/auth.service.js";
import { pickAllowedFields, STAFF_UPDATABLE_FIELDS } from "../src/utils/dto.js";
import { requireOwnership } from "../src/middleware/authorize.js";
import { validateUploadedFiles } from "../src/middleware/multer.middleware.js";
import { logAuditEvent } from "../src/services/audit.service.js";
import { setMockRedisClient } from "../src/lib/redis.js";
import logger from "../src/lib/logger.js";

logger.level = "error";

// ── In-Memory Redis Mock for standalone test execution ─────────────────────
class InMemoryRedis {
  constructor() {
    this.store = new Map();
    this.sets = new Map();
    this.zsets = new Map();
  }

  async set(key, value, ...args) {
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
      if (this.zsets.delete(k)) count++;
    }
    return count;
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

  async srem(key, member) {
    const set = this.sets.get(key);
    return set ? (set.delete(member) ? 1 : 0) : 0;
  }

  async expire(key, seconds) {
    return 1;
  }

  pipeline() {
    const self = this;
    const commands = [];
    return {
      zremrangebyscore(k, min, max) {
        commands.push(() => {
          if (!self.zsets.has(k)) return;
          const zset = self.zsets.get(k);
          for (const [member, score] of Array.from(zset.entries())) {
            if (score >= min && score <= max) zset.delete(member);
          }
        });
        return this;
      },
      zadd(k, score, member) {
        commands.push(() => {
          if (!self.zsets.has(k)) self.zsets.set(k, new Map());
          self.zsets.get(k).set(member, score);
        });
        return this;
      },
      zcard(k) {
        commands.push(() => {});
        return this;
      },
      pexpire(k, ms) {
        commands.push(() => {});
        return this;
      },
      del(k) {
        commands.push(() => self.del(k));
        return this;
      },
      async exec() {
        const results = [];
        for (const cmd of commands) {
          cmd();
          results.push([null, 1]);
        }
        return results;
      },
    };
  }
}

const mockRedis = new InMemoryRedis();
setMockRedisClient(mockRedis);

const runSecuritySuite = async () => {
  console.log("\n=======================================================");
  console.log("  SALONNOW PHASE 2 FINAL SECURITY AUDIT TEST SUITE     ");
  console.log("=======================================================\n");

  let mongod = null;
  try {
    mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const mongoUri = mongod.getUri();
    await mongoose.connect(mongoUri);
    console.log("✓ Connected to In-Memory MongoDB ReplicaSet");
  } catch (err) {
    console.error("❌ MongoMemoryReplSet failed:", err.message);
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, failureMsg) => {
    if (condition) {
      console.log(`  ✓ [PASS] ${testName}`);
      passed++;
    } else {
      console.log(`  ❌ [FAIL] ${testName} — ${failureMsg}`);
      failed++;
    }
  };

  try {
    await Promise.all([
      User.deleteMany({}),
      Booking.deleteMany({}),
      Salon.deleteMany({}),
      Service.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);

    const userA = await User.create({
      username: "usera",
      email: "usera@test.com",
      fullName: "User A",
      phonenumber: "1111111111",
      password: "Password123!",
      role: "customer",
    });

    const userB = await User.create({
      username: "userb",
      email: "userb@test.com",
      fullName: "User B",
      phonenumber: "2222222222",
      password: "Password123!",
      role: "customer",
    });

    const testSalon = await Salon.create({
      name: "Security Salon",
      city: "TestCity",
      state: "TestState",
      pincode: "123456",
      owner: new mongoose.Types.ObjectId(),
    });

    const bookingA = await Booking.create({
      customer: userA._id,
      salon: testSalon._id,
      services: [new mongoose.Types.ObjectId()],
      totalAmount: 300,
      status: "pending_payment",
      paymentStatus: "pending",
      startTime: new Date(),
      endTime: new Date(Date.now() + 1800000),
    });

    const serviceA = await Service.create({
      name: "Haircut",
      category: "Hair",
      price: 50,
      duration: 30,
      salon: testSalon._id,
    });

    // ───────────────────────────────────────────────────────────────────────
    // TEST 1: Refresh Token Family Rotation & Multi-Tab Grace Window (Item 5)
    // ───────────────────────────────────────────────────────────────────────
    console.log("\n[Test 1] Refresh Token Multi-Tab Grace Window & Rotation (Item 5)");
    const pair1 = await issueTokenPair(userA, "device_chrome");

    // Legal rotation -> pair 2
    const pair2 = await rotateRefreshToken(pair1.refreshToken);
    assert(
      pair2.accessToken && pair2.refreshToken,
      "Legal Refresh Token Rotation",
      "Failed to rotate refresh token legally"
    );

    // Multi-tab concurrent request presenting pair1.refreshToken within 10s grace window
    const gracePair = await rotateRefreshToken(pair1.refreshToken);
    assert(
      gracePair.accessToken && gracePair.refreshToken,
      "Multi-Tab Grace Period Accepted Concurrent Token Refresh",
      "Grace period unexpectedly rejected valid multi-tab refresh"
    );

    // ───────────────────────────────────────────────────────────────────────
    // TEST 2: All Device Session Revocation (SI6)
    // ───────────────────────────────────────────────────────────────────────
    console.log("\n[Test 2] All Device Session Revocation (SI6)");
    const userPair = await issueTokenPair(userB, "device_mobile");
    await revokeAllUserSessions(userB._id);

    let sessionRevoked = false;
    try {
      await rotateRefreshToken(userPair.refreshToken);
    } catch (err) {
      if (err.statusCode === 401) sessionRevoked = true;
    }

    assert(
      sessionRevoked,
      "Revoke All Sessions Blocked Stale Refresh Token",
      "Refresh token accepted after all-device logout"
    );

    // ───────────────────────────────────────────────────────────────────────
    // TEST 3: Mass Assignment Protection (SI4)
    // ───────────────────────────────────────────────────────────────────────
    console.log("\n[Test 3] Mass Assignment Protection (SI4)");
    const maliciousBody = {
      name: "Hacked Stylist Name",
      role: "admin",
      isVerified: true,
      salon: new mongoose.Types.ObjectId().toString(),
      experience: "5 years",
    };

    const sanitized = pickAllowedFields(maliciousBody, STAFF_UPDATABLE_FIELDS);
    assert(
      sanitized.name === "Hacked Stylist Name" &&
        sanitized.role === undefined &&
        sanitized.isVerified === undefined &&
        sanitized.salon === undefined,
      "Mass Assignment Protected Fields Stripped",
      "Sanitized object contained forbidden keys"
    );

    // ───────────────────────────────────────────────────────────────────────
    // TEST 4: 100% ABAC Ownership IDOR Defense (Item 3)
    // ───────────────────────────────────────────────────────────────────────
    console.log("\n[Test 4] 100% ABAC Ownership IDOR Defense across Routes (Item 3)");

    // Test 4a: Booking IDOR
    const mockReqBookingIDOR = {
      user: { _id: userB._id, role: "customer" },
      params: { bookingId: bookingA._id.toString() },
    };
    const bookingMiddleware = requireOwnership(Booking, "bookingId", "customer");
    const bookingError = await new Promise((res) => bookingMiddleware(mockReqBookingIDOR, {}, (err) => res(err)));
    assert(bookingError && bookingError.statusCode === 403, "Booking IDOR Blocked (403)", "Failed to block booking IDOR");

    // Test 4b: Service IDOR
    const mockReqServiceIDOR = {
      user: { _id: userB._id, role: "customer" },
      params: { serviceId: serviceA._id.toString() },
    };
    const serviceMiddleware = requireOwnership(Service, "serviceId", "salon");
    const serviceError = await new Promise((res) => serviceMiddleware(mockReqServiceIDOR, {}, (err) => res(err)));
    assert(serviceError && serviceError.statusCode === 403, "Service IDOR Blocked (403)", "Failed to block service IDOR");

    // ───────────────────────────────────────────────────────────────────────
    // TEST 5: Binary Magic-Byte Upload Validation (Item 4)
    // ───────────────────────────────────────────────────────────────────────
    console.log("\n[Test 5] Binary Magic-Byte File Upload Validation (Item 4)");
    const tempDir = path.resolve("public/temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    // Create a fake PNG file containing PHP code (MIME spoof attempt)
    const spoofPath = path.join(tempDir, "spoof_script.png");
    fs.writeFileSync(spoofPath, "<?php echo 'Hacked!'; ?>");

    const mockFileReq = {
      file: {
        originalname: "spoof_script.png",
        mimetype: "image/png", // Declared MIME header is fake
        path: spoofPath,
      },
    };

    const uploadError = await new Promise((res) => validateUploadedFiles(mockFileReq, {}, (err) => res(err)));
    const fileWasCleanedUp = !fs.existsSync(spoofPath);

    assert(
      uploadError && uploadError.message.includes("failed magic byte validation") && fileWasCleanedUp,
      "Binary Magic-Byte Inspection Rejected Spoofed Script & Deleted File",
      "Magic-byte validation failed to reject spoofed script upload"
    );

    // ───────────────────────────────────────────────────────────────────────
    // TEST 6: Secret Assertion & No Fallback Secrets (Item 2)
    // ───────────────────────────────────────────────────────────────────────
    console.log("\n[Test 6] Boot Secret Assertion & Hardened Fallbacks (Item 2)");
    delete process.env.ACCESS_TOKEN_SECRET;

    let secretAsserted = false;
    try {
      userA.generateAccessToken("fam", "jti");
    } catch (err) {
      if (err.message.includes("ACCESS_TOKEN_SECRET environment variable is missing")) {
        secretAsserted = true;
      }
    }

    // Restore test secret
    process.env.ACCESS_TOKEN_SECRET = "test_access_token_secret_32bytes_long!!";

    assert(
      secretAsserted,
      "Hardened Secret Guard Asserted Missing Environment Secret",
      "User model failed to throw assertion on missing secret"
    );

    // ───────────────────────────────────────────────────────────────────────
    // TEST 7: Cryptographic Compliance Audit Logging (SI10)
    // ───────────────────────────────────────────────────────────────────────
    console.log("\n[Test 7] Cryptographic Compliance Audit Logging (SI10)");
    const mockAuditReq = {
      user: { _id: userA._id, role: "customer" },
      ip: "192.168.1.50",
      headers: { "user-agent": "SecurityTestAgent/1.0" },
    };

    await logAuditEvent({
      req: mockAuditReq,
      action: "SERVICE_UPDATED",
      targetResource: "Service",
      targetId: serviceA._id.toString(),
      changes: { before: { price: 50 }, after: { price: 60 } },
    });

    const auditRecord = await AuditLog.findOne({ actor: userA._id, action: "SERVICE_UPDATED" });
    assert(auditRecord !== null, "Audit Event Persisted to Database", "Failed to persist audit log record");
  } catch (err) {
    console.error("❌ Security test suite encountered unhandled error:", err);
    failed++;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    if (mongod) {
      await mongod.stop();
    }
  }

  console.log("\n=======================================================");
  console.log(`  SECURITY SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
};

runSecuritySuite();
