import getRedisClient from "../lib/redis.js";
import ApiError from "../utils/apiError.js";
import logger from "../lib/logger.js";

/**
 * Distributed sliding-window rate limiter powered by Redis sorted sets (ZSET).
 * Safe for multi-instance load-balanced deployments (SI11, SI12).
 *
 * @param {object} options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.maxRequests - Max requests permitted in the time window
 * @param {string} options.keyPrefix - Metric identifier prefix (e.g. "auth_login", "hold_create")
 * @param {string} [options.message] - Custom 429 error message
 */
export const createRedisRateLimiter = ({
  windowMs = 15 * 60 * 1000,
  maxRequests = 100,
  keyPrefix = "api",
  message = "Too many requests. Please try again later.",
}) => {
  return async (req, res, next) => {
    const redis = getRedisClient();

    // Fallback if Redis is down — allow request but log warning
    if (!redis) {
      logger.warn({ keyPrefix }, "[RateLimiter] Redis client unavailable — skipping rate limit check");
      return next();
    }

    // Extract verified client IP (Express trust proxy 1 evaluates the true client hop)
    const clientIp = req.ip || req.socket?.remoteAddress || "127.0.0.1";
    const identifier = req.user?._id ? `user:${req.user._id}` : `ip:${clientIp}`;
    const redisKey = `rl:${keyPrefix}:${identifier}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      const pipeline = redis.pipeline();
      // Remove requests outside current sliding window
      pipeline.zremrangebyscore(redisKey, 0, windowStart);
      // Add current request
      pipeline.zadd(redisKey, now, `${now}_${Math.random().toString(36).slice(2, 7)}`);
      // Count requests in current sliding window
      pipeline.zcard(redisKey);
      // Set TTL on key for automatic cleanup
      pipeline.pexpire(redisKey, windowMs);

      const results = await pipeline.exec();
      const currentCount = results[2][1]; // ZCARD output

      res.setHeader("X-RateLimit-Limit", maxRequests);
      res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - currentCount));

      if (currentCount > maxRequests) {
        logger.warn(
          { identifier, keyPrefix, currentCount, maxRequests },
          "[RateLimiter Blocked] Exceeded sliding-window rate limit"
        );
        throw new ApiError(429, message, [{ code: "TOO_MANY_REQUESTS" }]);
      }

      next();
    } catch (err) {
      if (err instanceof ApiError) throw err;
      logger.error({ err: err.message, keyPrefix }, "[RateLimiter Error] Failed to execute sliding window query");
      next(); // Fail open on Redis error so legitimate user requests aren't blocked
    }
  };
};

// ─── Shared Rate Limiter Presets ─────────────────────────────────────────────

// Strict auth rate limit (5 attempts / 15 mins)
export const authStrictLimiter = createRedisRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  keyPrefix: "auth_strict",
  message: "Too many authentication attempts. Please try again after 15 minutes.",
});

// Slot hold rate limit (10 holds / 1 min)
export const holdRateLimiter = createRedisRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  keyPrefix: "hold_create",
  message: "Too many booking hold attempts. Please wait a minute before holding another slot.",
});

// General API rate limit (100 req / 1 min)
export const generalApiLimiter = createRedisRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
  keyPrefix: "general_api",
  message: "Too many requests from this IP/User. Please slow down.",
});
