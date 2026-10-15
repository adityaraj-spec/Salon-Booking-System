import crypto from "crypto";
import getRedisClient from "../lib/redis.js";
import ApiError from "./apiError.js";
import logger from "../lib/logger.js";

const MAX_ATTEMPTS = 5;
const INITIAL_LOCKOUT_SECONDS = 60; // 1 minute
const OTP_REQUEST_LIMIT = 3;
const OTP_REQUEST_WINDOW_SECONDS = 10 * 60;

/**
 * Generates a cryptographically secure 4-digit OTP code.
 * @returns {string}
 */
export const generateOTP = () => {
  return crypto.randomInt(1000, 10000).toString();
};

export const checkOTPRequestRateLimit = async (email, ipAddress = "unknown") => {
  const redis = getRedisClient();
  if (!redis) {
    if (process.env.NODE_ENV === "production") {
      throw new ApiError(503, "Verification service is temporarily unavailable. Please try again later.");
    }
    return;
  }

  const keys = [`otp:requests:email:${email.toLowerCase()}`, `otp:requests:ip:${ipAddress}`];
  try {
    const counts = [];
    for (const key of keys) {
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, OTP_REQUEST_WINDOW_SECONDS);
      counts.push(count);
    }
    if (counts.some((count) => count > OTP_REQUEST_LIMIT)) {
      throw new ApiError(429, "Too many verification code requests. Please try again later.");
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logger.warn({ err: err.message }, "[OTP] Request rate-limit check failed");
  }
};

/**
 * Hashes an OTP string using SHA-256.
 * @param {string} otp
 * @returns {string}
 */
export const hashOTP = (otp) => {
  return crypto.createHash("sha256").update(otp.toString()).digest("hex");
};

/**
 * Secure constant-time comparison of plain OTP against hashed OTP.
 * @param {string} inputOTP
 * @param {string} storedHash
 * @returns {boolean}
 */
export const verifyOTPHash = (inputOTP, storedHash) => {
  if (!inputOTP || !storedHash) return false;
  const inputHash = hashOTP(inputOTP);
  const bufferA = Buffer.from(inputHash, "utf8");
  const bufferB = Buffer.from(storedHash, "utf8");
  if (bufferA.length !== bufferB.length) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
};

/**
 * Checks if an email is locked out from verification attempts.
 * @param {string} email
 */
export const checkOTPLockout = async (email) => {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    const lockoutTtl = await redis.ttl(`otp:lockout:${email}`);
    if (lockoutTtl > 0) {
      throw new ApiError(
        429,
        `Too many failed attempts. Account locked out. Please try again in ${Math.ceil(lockoutTtl / 60)} minute(s).`
      );
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logger.warn({ email, err: err.message }, "[OTP] Redis lockout check failed — skipping");
  }
};

/**
 * Records a failed OTP attempt and triggers lockout if max attempts reached.
 * @param {string} email
 */
export const recordOTPAttempt = async (email) => {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    const attemptsKey = `otp:attempts:${email}`;
    const lockoutCountKey = `otp:lockout_count:${email}`;

    const attempts = await redis.incr(attemptsKey);
    if (attempts === 1) {
      await redis.expire(attemptsKey, 15 * 60); // 15-min attempt window
    }

    if (attempts >= MAX_ATTEMPTS) {
      const lockouts = (await redis.incr(lockoutCountKey)) || 1;
      await redis.expire(lockoutCountKey, 24 * 60 * 60); // 24-hr lockout history window

      // Exponential lockout: 1m, 2m, 4m, 8m...
      const lockoutDuration = INITIAL_LOCKOUT_SECONDS * Math.pow(2, lockouts - 1);
      await redis.set(`otp:lockout:${email}`, "1", "EX", lockoutDuration);
      await redis.del(attemptsKey);

      throw new ApiError(
        429,
        `Too many failed verification attempts. Account locked out for ${Math.ceil(lockoutDuration / 60)} minute(s).`
      );
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logger.warn({ email, err: err.message }, "[OTP] Redis record attempt failed");
  }
};

/**
 * Clears OTP attempts and lockout state upon successful verification.
 * @param {string} email
 */
export const clearOTPState = async (email) => {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.del(`otp:attempts:${email}`);
    await redis.del(`otp:lockout:${email}`);
    await redis.del(`otp:lockout_count:${email}`);
  } catch (err) {
    logger.warn({ email, err: err.message }, "[OTP] Redis clear state failed");
  }
};
