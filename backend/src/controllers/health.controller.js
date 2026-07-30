import mongoose from "mongoose";
import getRedisClient from "../lib/redis.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";

export const getLiveness = asyncHandler(async (req, res) => {
  const healthData = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    memoryUsageMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    environment: process.env.NODE_ENV || "development",
    version: "1.0.0",
  };

  return res.status(200).json(new ApiResponse(200, healthData, "Service is healthy"));
});

export const getReadiness = asyncHandler(async (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";

  let redisStatus = "disabled_in_test";
  if (process.env.NODE_ENV !== "test") {
    try {
      const redis = getRedisClient();
      if (redis) {
        await redis.ping();
        redisStatus = "connected";
      } else {
        redisStatus = "unavailable";
      }
    } catch (err) {
      redisStatus = "error";
    }
  }

  const isReady = mongoStatus === "connected";
  const statusCode = isReady ? 200 : 503;

  const readinessData = {
    status: isReady ? "ready" : "not_ready",
    timestamp: new Date().toISOString(),
    dependencies: {
      mongo: mongoStatus,
      redis: redisStatus,
    },
  };

  return res.status(statusCode).json(new ApiResponse(statusCode, readinessData, `Service is ${readinessData.status}`));
});
