import jwt from "jsonwebtoken";
import ApiError from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";
import { cacheGet, cacheSet, cacheDel } from "../lib/cacheManager.js";
import getRedisClient from "../lib/redis.js";
import logger, { enrichLogContext } from "../lib/logger.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "") || req.cookies?.accessToken;

    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const userId = decodedToken?.id || decodedToken?._id;

    if (!userId) {
      throw new ApiError(401, "Invalid Access Token");
    }

    // Part 10: Check if token JTI is in Redis blacklist (e.g. after logout or revocation)
    if (decodedToken.jti) {
      try {
        const redis = getRedisClient();
        const isReady = !redis?.status || redis.status === "ready" || redis.status === "connect";
        if (redis && isReady) {
          const isBlacklisted = await redis.get(`rt:blacklist:${decodedToken.jti}`);
          if (isBlacklisted) {
            logger.warn({ userId, jti: decodedToken.jti }, "[Auth] Blacklisted access token presented");
            throw new ApiError(401, "Token has been revoked — please log in again");
          }
        }
      } catch (redisErr) {
        if (redisErr instanceof ApiError) throw redisErr;
        logger.warn({ err: redisErr.message }, "[Auth] Redis blacklist check bypassed due to Redis connection issue");
      }
    }

    const cacheKey = `user:session:${userId}`;
    let user = await cacheGet(cacheKey);

    if (!user) {
      user = await User.findById(userId).select("-password -refreshToken").lean();
      if (!user) {
        throw new ApiError(401, "Invalid Access Token");
      }
      await cacheSet(cacheKey, user, 300); // 5 minutes TTL
    }

    req.user = user;
    // Enrich the AsyncLocalStorage context with the authenticated userId
    // so every log line in this request automatically carries it
    enrichLogContext({ userId: user._id?.toString() || userId.toString() });
    next();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.warn({ err: error.message }, "[Auth] JWT verification error");
    throw new ApiError(401, error?.message || "Invalid Access Token");
  }
});

export const clearUserSessionCache = async (userId) => {
  if (userId) {
    await cacheDel(`user:session:${userId}`);
  }
};