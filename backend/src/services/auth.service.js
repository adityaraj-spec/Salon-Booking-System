import jwt from "jsonwebtoken";
import crypto from "crypto";
import getRedisClient from "../lib/redis.js";
import { User } from "../models/user.models.js";
import ApiError from "../utils/apiError.js";
import logger from "../lib/logger.js";

const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const BLACKLIST_TTL_SECONDS = 15 * 60; // 15 minutes (matches access token expiry)
const ROTATION_GRACE_PERIOD_MS = 10000; // 10-second grace window for concurrent multi-tab requests (Item 5)

/**
 * Issues a fresh access and refresh token pair linked to a token family.
 */
export const issueTokenPair = async (user, deviceId = "unknown") => {
  const familyId = crypto.randomUUID();
  const jti = crypto.randomUUID();

  const accessToken = user.generateAccessToken(familyId, jti);
  const refreshToken = user.generateRefreshToken(familyId, jti);

  const redis = getRedisClient();
  if (redis) {
    try {
      const familyKey = `rt:family:${familyId}`;
      const sessionData = JSON.stringify({
        jti,
        userId: user._id.toString(),
        deviceId,
        createdAt: new Date().toISOString(),
        previousJti: null,
        rotatedAt: null,
      });
      await redis.set(familyKey, sessionData, "EX", REFRESH_TTL_SECONDS);

      await redis.sadd(`rt:user_sessions:${user._id}`, familyId);
      await redis.expire(`rt:user_sessions:${user._id}`, REFRESH_TTL_SECONDS);
    } catch (err) {
      logger.warn({ err: err.message, userId: user._id }, "[AuthService] Redis session tracking failed");
    }
  }

  await user.setRefreshToken(refreshToken);
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken, familyId, jti };
};

/**
 * Rotates a refresh token atomically with a 10-second grace window (Item 5).
 *
 * Concurrent requests from multi-tab browser refreshes presenting the immediate
 * previous JTI within 10 seconds of rotation receive the current active session
 * instead of triggering false-positive theft detection.
 */
export const rotateRefreshToken = async (incomingRefreshToken) => {
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token is required");
  }

  if (!process.env.REFRESH_TOKEN_SECRET) {
    throw new Error("CRITICAL SECURITY ERROR: REFRESH_TOKEN_SECRET environment variable is missing!");
  }

  let decoded;
  try {
    decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch (err) {
    throw new ApiError(401, "Expired or invalid refresh token — please log in again");
  }

  const { id: userId, jti: incomingJti, fam: familyId } = decoded;

  if (!userId || !familyId || !incomingJti) {
    throw new ApiError(401, "Malformed refresh token claims");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(401, "User no longer exists");
  }

  const redis = getRedisClient();
  const isReady = !redis?.status || redis.status === "ready" || redis.status === "connect";
  if (redis && isReady) {
    try {
      const familyKey = `rt:family:${familyId}`;
      const headStr = await redis.get(familyKey);

      if (headStr) {
        const currentHead = JSON.parse(headStr);
        const now = Date.now();

        // ── 1. LEGAL ROTATION (Exact Head Match) ──────────────────────────────
        if (currentHead.jti === incomingJti) {
          const newJti = crypto.randomUUID();
          const newAccessToken = user.generateAccessToken(familyId, newJti);
          const newRefreshToken = user.generateRefreshToken(familyId, newJti);

          const updatedSession = JSON.stringify({
            ...currentHead,
            jti: newJti,
            previousJti: incomingJti,
            rotatedAt: new Date(now).toISOString(),
          });

          await redis.set(familyKey, updatedSession, "EX", REFRESH_TTL_SECONDS);
          await redis.set(`rt:blacklist:${incomingJti}`, "rotated", "EX", BLACKLIST_TTL_SECONDS);

          await user.setRefreshToken(newRefreshToken);
          await user.save({ validateBeforeSave: false });

          logger.debug({ userId, familyId, newJti }, "[AuthService] Refresh token rotated successfully");
          return { accessToken: newAccessToken, refreshToken: newRefreshToken };
        }

        // ── 2. CONCURRENT MULTI-TAB GRACE PERIOD MATCH (Item 5 Fix) ────────────
        // If incoming JTI matches previousJti and within 10s of rotatedAt, return new token pair
        if (
          currentHead.previousJti === incomingJti &&
          currentHead.rotatedAt &&
          now - new Date(currentHead.rotatedAt).getTime() <= ROTATION_GRACE_PERIOD_MS
        ) {
          logger.info(
            { userId, familyId, incomingJti, currentJti: currentHead.jti },
            "[AuthService] Concurrent multi-tab refresh within grace period — issuing active token pair"
          );

          const newAccessToken = user.generateAccessToken(familyId, currentHead.jti);
          const newRefreshToken = user.generateRefreshToken(familyId, currentHead.jti);
          return { accessToken: newAccessToken, refreshToken: newRefreshToken };
        }

        // ── 3. REAL THEFT DETECTED ──────────────────────────────────────────────
        logger.error(
          { userId, familyId, incomingJti, expectedJti: currentHead.jti, previousJti: currentHead.previousJti },
          "[AuthService] THEFT DETECTED! Stale refresh token reused outside grace period. Revoking entire token family."
        );

        await redis.del(familyKey);
        await redis.srem(`rt:user_sessions:${userId}`, familyId);

        await redis.set(`rt:blacklist:${incomingJti}`, "stolen", "EX", BLACKLIST_TTL_SECONDS);
        await redis.set(`rt:blacklist:${currentHead.jti}`, "revoked", "EX", BLACKLIST_TTL_SECONDS);

        await user.setRefreshToken(null);
        await user.save({ validateBeforeSave: false });

        throw new ApiError(
          401,
          "Security Alert: Session compromise detected. All active sessions have been revoked for your safety.",
          [{ code: "TOKEN_THEFT_DETECTED" }]
        );
      }
    } catch (err) {
      if (err instanceof ApiError) throw err;
      logger.warn({ err: err.message, userId }, "[AuthService] Redis error during token rotation, falling back to database verification");
    }
  }

  // Fallback if Redis is down
  const isValid = await user.isRefreshTokenCorrect(incomingRefreshToken);
  if (!isValid) {
    throw new ApiError(401, "Invalid refresh token");
  }

  const familyIdFallback = crypto.randomUUID();
  const jtiFallback = crypto.randomUUID();
  const accessToken = user.generateAccessToken(familyIdFallback, jtiFallback);
  const refreshToken = user.generateRefreshToken(familyIdFallback, jtiFallback);

  await user.setRefreshToken(refreshToken);
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

/**
 * Revokes a single token family session (Logout).
 */
export const revokeSession = async (familyId, jti) => {
  const redis = getRedisClient();
  if (redis) {
    if (familyId) await redis.del(`rt:family:${familyId}`);
    if (jti) await redis.set(`rt:blacklist:${jti}`, "logout", "EX", BLACKLIST_TTL_SECONDS);
  }
};

/**
 * Revokes ALL active token families and user sessions across all devices (SI6).
 */
export const revokeAllUserSessions = async (userId) => {
  const redis = getRedisClient();
  if (redis) {
    try {
      const familyIds = await redis.smembers(`rt:user_sessions:${userId}`);
      if (familyIds && familyIds.length > 0) {
        const pipeline = redis.pipeline();
        for (const fam of familyIds) {
          pipeline.del(`rt:family:${fam}`);
        }
        pipeline.del(`rt:user_sessions:${userId}`);
        await pipeline.exec();
      }
      await redis.del(`user:session:${userId}`);
      logger.info({ userId }, "[AuthService] Revoked all user sessions across all devices");
    } catch (err) {
      logger.warn({ userId, err: err.message }, "[AuthService] Error revoking user sessions in Redis");
    }
  }

  const user = await User.findById(userId);
  if (user) {
    await user.setRefreshToken(null);
    await user.save({ validateBeforeSave: false });
  }
};
