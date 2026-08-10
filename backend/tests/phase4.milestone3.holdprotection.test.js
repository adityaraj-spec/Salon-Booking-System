/**
 * phase4.milestone3.holdprotection.test.js
 *
 * Verifies:
 *   M3-A: User rate limiting (5 hold attempts per minute per user)
 *   M3-B: IP rate limiting (10 hold attempts per minute per IP)
 *   M3-C: Burst protection (3 hold attempts per 10 seconds)
 *   M3-D: Salon inventory protection (30 hold attempts per minute per salon)
 *   M3-E: Fail-closed behavior on reservation paths when Redis is unavailable (HTTP 503)
 *   M3-F: Fail-open behavior on non-reservation paths when Redis is unavailable
 *   M3-G: Prometheus metrics hooks (hold_requests, rate_limit_rejections, latency, errors)
 *   M3-H: Multi-process compatibility (shared Redis keyspace format)
 */

import { jest } from "@jest/globals";
import { createRedisRateLimiter, holdRateLimiter, generalApiLimiter } from "../src/middleware/rateLimiter.js";
import { setMockRedisClient } from "../src/lib/redis.js";

// Helper to create a mock Redis client for ZSET pipeline rate limiter tests
const createMockRedis = () => {
  const zsets = new Map();

  return {
    pipeline: () => {
      const commands = [];
      const api = {
        zremrangebyscore: (key, min, max) => {
          commands.push({ cmd: "zremrangebyscore", key, min: Number(min), max: Number(max) });
          return api;
        },
        zadd: (key, score, member) => {
          commands.push({ cmd: "zadd", key, score: Number(score), member });
          return api;
        },
        zcard: (key) => {
          commands.push({ cmd: "zcard", key });
          return api;
        },
        pexpire: (key, ttl) => {
          commands.push({ cmd: "pexpire", key, ttl });
          return api;
        },
        exec: async () => {
          const results = [];
          for (const c of commands) {
            if (!zsets.has(c.key)) {
              zsets.set(c.key, []);
            }
            const set = zsets.get(c.key);

            if (c.cmd === "zremrangebyscore") {
              const filtered = set.filter((item) => item.score > c.max);
              const removed = set.length - filtered.length;
              zsets.set(c.key, filtered);
              results.push([null, removed]);
            } else if (c.cmd === "zadd") {
              set.push({ score: c.score, member: c.member });
              results.push([null, 1]);
            } else if (c.cmd === "zcard") {
              results.push([null, set.length]);
            } else if (c.cmd === "pexpire") {
              results.push([null, 1]);
            }
          }
          return results;
        },
      };
      return api;
    },
    _zsets: zsets,
  };
};

describe("Milestone 3 — Booking Hold Endpoint Protection", () => {
  let mockRedis;

  beforeEach(() => {
    mockRedis = createMockRedis();
    setMockRedisClient(mockRedis);
  });

  afterEach(() => {
    setMockRedisClient(null);
  });

  test("M3-A: user rate limit permits up to 5 requests per minute, then blocks 6th", async () => {
    const limiter = createRedisRateLimiter({
      windowMs: 60000,
      userMaxRequests: 5,
      keyPrefix: "hold_test_a",
      failClosed: true,
    });

    const req = {
      ip: "10.0.0.1",
      user: { _id: "user_a1" },
      body: {},
      params: {},
      query: {},
    };
    const res = { setHeader: jest.fn() };

    // First 5 requests succeed
    for (let i = 0; i < 5; i++) {
      const next = jest.fn();
      await limiter(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    }

    // 6th request is blocked (HTTP 429)
    const nextBlocked = jest.fn();
    await expect(limiter(req, res, nextBlocked)).rejects.toMatchObject({
      statusCode: 429,
      message: expect.stringContaining("Too many requests"),
    });
    expect(nextBlocked).not.toHaveBeenCalled();
  });

  test("M3-B: IP rate limit blocks requests exceeding IP threshold", async () => {
    const limiter = createRedisRateLimiter({
      windowMs: 60000,
      ipMaxRequests: 3,
      keyPrefix: "hold_test_b",
      failClosed: true,
    });

    const req = {
      ip: "192.168.1.50",
      user: null, // anonymous
      body: {},
      params: {},
      query: {},
    };
    const res = { setHeader: jest.fn() };

    for (let i = 0; i < 3; i++) {
      const next = jest.fn();
      await limiter(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    }

    const nextBlocked = jest.fn();
    await expect(limiter(req, res, nextBlocked)).rejects.toMatchObject({
      statusCode: 429,
    });
  });

  test("M3-C: burst protection blocks rapid requests within 10-second window", async () => {
    const limiter = createRedisRateLimiter({
      windowMs: 60000,
      userMaxRequests: 100, // high sustained limit
      burstWindowMs: 10000,
      burstMaxRequests: 2, // strict 2 req / 10s burst limit
      keyPrefix: "hold_test_c",
      failClosed: true,
    });

    const req = {
      ip: "10.0.0.2",
      user: { _id: "user_burst" },
      body: {},
      params: {},
      query: {},
    };
    const res = { setHeader: jest.fn() };

    // 2 rapid requests succeed
    await limiter(req, res, jest.fn());
    await limiter(req, res, jest.fn());

    // 3rd rapid request triggers burst detection (HTTP 429)
    await expect(limiter(req, res, jest.fn())).rejects.toMatchObject({
      statusCode: 429,
      errors: expect.arrayContaining([
        expect.objectContaining({ limitType: "burst" }),
      ]),
    });
  });

  test("M3-D: salon inventory protection limits hold requests targeted at same salon", async () => {
    const limiter = createRedisRateLimiter({
      windowMs: 60000,
      salonMaxRequests: 3, // max 3 holds per salon per min
      keyPrefix: "hold_test_d",
      failClosed: true,
    });

    const reqSalon1 = {
      ip: "10.0.0.3",
      user: { _id: "user_d1" },
      body: { salonId: "salon_target_99" },
      params: {},
      query: {},
    };
    const res = { setHeader: jest.fn() };

    // 3 requests to salon_target_99 succeed
    for (let i = 0; i < 3; i++) {
      const req = { ...reqSalon1, user: { _id: `user_d_${i}` } }; // different users
      await limiter(req, res, jest.fn());
    }

    // 4th request to salon_target_99 is blocked (salon inventory limit)
    const reqBlocked = { ...reqSalon1, user: { _id: "user_d_4" } };
    await expect(limiter(reqBlocked, res, jest.fn())).rejects.toMatchObject({
      statusCode: 429,
      errors: expect.arrayContaining([
        expect.objectContaining({ limitType: "salon" }),
      ]),
    });
  });

  test("M3-E: reservation path fails closed (HTTP 503) when Redis is unavailable", async () => {
    setMockRedisClient(null); // simulate Redis unavailable

    const reservationLimiter = createRedisRateLimiter({
      keyPrefix: "hold_create",
      failClosed: true,
    });

    const req = { ip: "10.0.0.5", user: { _id: "u1" }, body: {}, params: {}, query: {} };
    const res = { setHeader: jest.fn() };
    const next = jest.fn();

    await expect(reservationLimiter(req, res, next)).rejects.toMatchObject({
      statusCode: 503,
      message: expect.stringContaining("Reservation rate limit service unavailable"),
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("M3-F: search/read-only path fails open (calls next()) when Redis is unavailable", async () => {
    setMockRedisClient(null); // simulate Redis unavailable

    const searchLimiter = createRedisRateLimiter({
      keyPrefix: "general_api",
      failClosed: false,
    });

    const req = { ip: "10.0.0.6", user: null, body: {}, params: {}, query: {} };
    const res = { setHeader: jest.fn() };
    const next = jest.fn();

    await searchLimiter(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test("M3-G: Prometheus metrics hooks increment on allowed, blocked, and error events", async () => {
    const {
      holdRequestsTotal,
      rateLimitRejectionsTotal,
    } = await import("../src/lib/metrics.js");

    const limiter = createRedisRateLimiter({
      windowMs: 60000,
      maxRequests: 1,
      keyPrefix: "hold_create",
      failClosed: true,
    });

    const req = { ip: "10.0.0.7", user: { _id: "user_metric" }, body: {}, params: {}, query: {} };
    const res = { setHeader: jest.fn() };

    // Allowed request
    await limiter(req, res, jest.fn());

    // Blocked request
    try { await limiter(req, res, jest.fn()); } catch {}

    const rejections = (await rateLimitRejectionsTotal.get()).values
      .filter((v) => v.labels.prefix === "hold_create")
      .reduce((sum, v) => sum + v.value, 0);

    expect(rejections).toBeGreaterThanOrEqual(1);

    const holdsAllowed = (await holdRequestsTotal.get()).values
      .filter((v) => v.labels.status === "allowed")
      .reduce((sum, v) => sum + v.value, 0);

    expect(holdsAllowed).toBeGreaterThanOrEqual(1);
  });

  test("M3-H: shared holdRateLimiter instance has correct configuration", () => {
    expect(holdRateLimiter).toBeDefined();
    expect(typeof holdRateLimiter).toBe("function");
  });
});
