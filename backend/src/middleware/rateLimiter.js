import getRedisClient from "../lib/redis.js";
import ApiError from "../utils/apiError.js";
import logger from "../lib/logger.js";
import {
  holdRequestsTotal,
  rateLimitRejectionsTotal,
  rateLimiterLatencySeconds,
  rateLimiterErrorsTotal,
} from "../lib/metrics.js";

/**
 * Distributed sliding-window rate limiter powered by Redis sorted sets (ZSET).
 * Multi-dimensional (IP, User, Salon, Burst, Sustained) & safe for horizontally scaled deployments.
 *
 * @param {object} options
 * @param {number} [options.windowMs=60000] - Time window in milliseconds for sustained limit (default: 1 min)
 * @param {number} [options.maxRequests=100] - Max requests permitted in default sustained window
 * @param {number} [options.burstWindowMs] - Optional burst window in ms (e.g. 10000 = 10s)
 * @param {number} [options.burstMaxRequests] - Optional max requests in burst window (e.g. 3)
 * @param {number} [options.userMaxRequests] - Optional max requests per authenticated user in sustained window
 * @param {number} [options.ipMaxRequests] - Optional max requests per IP address in sustained window
 * @param {number} [options.salonMaxRequests] - Optional max requests per salon in sustained window (inventory protection)
 * @param {string} [options.keyPrefix="api"] - Redis key identifier prefix
 * @param {boolean} [options.failClosed=false] - If true, fails closed (HTTP 503) when Redis is down/errors
 * @param {string} [options.message] - Custom 429 error message
 */
export const createRedisRateLimiter = ({
  windowMs = 60 * 1000,
  maxRequests = 100,
  burstWindowMs,
  burstMaxRequests,
  userMaxRequests,
  ipMaxRequests,
  salonMaxRequests,
  keyPrefix = "api",
  failClosed = false,
  message = "Too many requests. Please try again later.",
}) => {
  return async (req, res, next) => {
    const startHr = process.hrtime.bigint();
    const redis = getRedisClient();

    const clientIp = req.ip || req.socket?.remoteAddress || "127.0.0.1";
    const userId = req.user?._id ? req.user._id.toString() : null;
    const salonId = req.body?.salonId || req.params?.salonId || req.query?.salonId || null;

    // ── Handle Redis Unavailability ──────────────────────────────────────────
    if (!redis) {
      try { rateLimiterErrorsTotal.inc({ prefix: keyPrefix, mode: failClosed ? "fail_closed" : "fail_open" }); } catch {}
      if (keyPrefix === "hold_create") {
        try { holdRequestsTotal.inc({ status: "error" }); } catch {}
      }

      if (failClosed) {
        logger.error(
          { keyPrefix, failClosed: true, ip: clientIp, userId, salonId },
          "[RateLimiter] Redis client unavailable — failing closed for reservation path"
        );
        throw new ApiError(
          503,
          "Reservation rate limit service unavailable. Please try again later.",
          [{ code: "RATE_LIMITER_UNAVAILABLE" }]
        );
      }

      logger.warn(
        { keyPrefix, failClosed: false },
        "[RateLimiter] Redis client unavailable — skipping rate limit check (fail open)"
      );
      return next();
    }

    const now = Date.now();
    const randomMember = `${now}_${Math.random().toString(36).slice(2, 7)}`;

    // ── Build multi-dimensional checks for single Redis pipeline roundtrip ──
    const checks = [];

    // 1. Burst Check (short window, e.g. 10s)
    if (burstWindowMs && burstMaxRequests) {
      const burstKey = userId
        ? `rl:${keyPrefix}:burst:user:${userId}`
        : `rl:${keyPrefix}:burst:ip:${clientIp}`;
      checks.push({
        type: "burst",
        key: burstKey,
        windowMs: burstWindowMs,
        maxRequests: burstMaxRequests,
      });
    }

    // 2. User Sustained Check
    if (userId && userMaxRequests) {
      checks.push({
        type: "user",
        key: `rl:${keyPrefix}:user:${userId}`,
        windowMs,
        maxRequests: userMaxRequests,
      });
    }

    // 3. IP Sustained Check
    if (ipMaxRequests || (!userId && maxRequests)) {
      checks.push({
        type: "ip",
        key: `rl:${keyPrefix}:ip:${clientIp}`,
        windowMs,
        maxRequests: ipMaxRequests || maxRequests,
      });
    }

    // 4. Salon Inventory Protection Check
    if (salonId && salonMaxRequests) {
      checks.push({
        type: "salon",
        key: `rl:${keyPrefix}:salon:${salonId}`,
        windowMs,
        maxRequests: salonMaxRequests,
      });
    }

    // Fallback single key check if no multi-dimensional rules were specified
    if (checks.length === 0) {
      const identifier = userId ? `user:${userId}` : `ip:${clientIp}`;
      checks.push({
        type: userId ? "user" : "ip",
        key: `rl:${keyPrefix}:${identifier}`,
        windowMs,
        maxRequests,
      });
    }

    try {
      const pipeline = redis.pipeline();

      for (const check of checks) {
        const windowStart = now - check.windowMs;
        pipeline.zremrangebyscore(check.key, 0, windowStart);
        pipeline.zadd(check.key, now, `${randomMember}_${check.type}`);
        pipeline.zcard(check.key);
        pipeline.pexpire(check.key, check.windowMs);
      }

      const results = await pipeline.exec();
      let violatedCheck = null;
      let primaryCheckCount = 0;
      let primaryCheckMax = maxRequests;

      for (let i = 0; i < checks.length; i++) {
        const check = checks[i];
        const currentCount = results[i * 4 + 2]?.[1] || 0; // ZCARD index

        if (i === 0) {
          primaryCheckCount = currentCount;
          primaryCheckMax = check.maxRequests;
        }

        if (currentCount > check.maxRequests && !violatedCheck) {
          violatedCheck = { ...check, currentCount };
        }
      }

      // Record check latency metric
      const durationSeconds = Number(process.hrtime.bigint() - startHr) / 1e9;
      try { rateLimiterLatencySeconds.observe({ prefix: keyPrefix }, durationSeconds); } catch {}

      // ── Handle Rate Limit Violation ───────────────────────────────────────
      if (violatedCheck) {
        try {
          rateLimitRejectionsTotal.inc({
            prefix: keyPrefix,
            type: violatedCheck.type,
            reason: "exceeded",
          });
        } catch {}

        if (keyPrefix === "hold_create") {
          try { holdRequestsTotal.inc({ status: "blocked" }); } catch {}
        }

        const isBurst = violatedCheck.type === "burst";
        logger.warn(
          {
            identifier: violatedCheck.key,
            keyPrefix,
            limitType: violatedCheck.type,
            currentCount: violatedCheck.currentCount,
            maxRequests: violatedCheck.maxRequests,
            isBurst,
            salonId,
            ip: clientIp,
            userId,
          },
          isBurst
            ? "[RateLimiter Burst Detected] High request frequency burst blocked"
            : "[RateLimiter Blocked] Exceeded sliding-window rate limit"
        );

        res.setHeader("X-RateLimit-Limit", violatedCheck.maxRequests);
        res.setHeader("X-RateLimit-Remaining", 0);

        throw new ApiError(429, message, [
          { code: "TOO_MANY_REQUESTS", limitType: violatedCheck.type },
        ]);
      }

      // ── Limit Passed ──────────────────────────────────────────────────────
      res.setHeader("X-RateLimit-Limit", primaryCheckMax);
      res.setHeader("X-RateLimit-Remaining", Math.max(0, primaryCheckMax - primaryCheckCount));

      if (keyPrefix === "hold_create") {
        try { holdRequestsTotal.inc({ status: "allowed" }); } catch {}
      }

      next();
    } catch (err) {
      if (err instanceof ApiError) throw err;

      try { rateLimiterErrorsTotal.inc({ prefix: keyPrefix, mode: failClosed ? "fail_closed" : "fail_open" }); } catch {}
      if (keyPrefix === "hold_create") {
        try { holdRequestsTotal.inc({ status: "error" }); } catch {}
      }

      if (failClosed) {
        logger.error(
          { err: err.message, keyPrefix, failClosed: true },
          "[RateLimiter Error] Failed to execute rate limiter query — failing closed"
        );
        throw new ApiError(
          503,
          "Reservation rate limiter error. Please try again later.",
          [{ code: "RATE_LIMITER_ERROR" }]
        );
      }

      logger.error(
        { err: err.message, keyPrefix, failClosed: false },
        "[RateLimiter Error] Failed to execute rate limiter query — failing open"
      );
      next(); // Fail open for non-critical paths
    }
  };
};

// ─── Shared Rate Limiter Presets ─────────────────────────────────────────────

// Strict auth rate limit (5 attempts / 15 mins)
export const authStrictLimiter = createRedisRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  keyPrefix: "auth_strict",
  failClosed: false,
  message: "Too many authentication attempts. Please try again after 15 minutes.",
});

/**
 * Booking Hold Endpoint Rate Limiter (Milestone 3).
 * Multi-dimensional protection:
 *   - User limit: 5 hold attempts per minute per authenticated user
 *   - IP limit: 10 hold attempts per minute per IP address
 *   - Salon inventory limit: 30 hold attempts per minute per salon (protects salon capacity)
 *   - Burst limit: 3 hold attempts per 10 seconds (throttles rapid bot bursts)
 *   - Fail-closed mode (failClosed: true): fails closed (HTTP 503) if Redis is offline
 */
export const holdRateLimiter = createRedisRateLimiter({
  windowMs: 60 * 1000,           // 1 minute sustained window
  maxRequests: 10,               // default sustained limit
  userMaxRequests: 5,            // max 5 hold attempts / min per user
  ipMaxRequests: 10,             // max 10 hold attempts / min per IP
  salonMaxRequests: 30,          // max 30 hold attempts / min per salon
  burstWindowMs: 10 * 1000,      // 10 second burst window
  burstMaxRequests: 3,           // max 3 hold attempts / 10s burst
  keyPrefix: "hold_create",
  failClosed: true,              // Reservation path MUST fail closed on Redis outage
  message: "Too many booking hold attempts. Please wait a moment before trying again.",
});

// General API rate limit (100 req / 1 min)
export const generalApiLimiter = createRedisRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
  keyPrefix: "general_api",
  failClosed: false,
  message: "Too many requests from this IP/User. Please slow down.",
});

