/**
 * health.controller.js — Kubernetes/Docker health probe endpoints.
 *
 * # Probe Types
 *
 *   GET /health/live   — Liveness probe
 *     Returns 200 if the Node.js event loop is responsive and the process is alive.
 *     A non-200 response causes Kubernetes to RESTART the container.
 *     Does NOT check downstream dependencies (Redis, MongoDB) — that's readiness.
 *
 *   GET /health/ready  — Readiness probe
 *     Returns 200 if ALL critical dependencies are reachable within timeout limits.
 *     A non-200 response causes Kubernetes to REMOVE the pod from the load balancer
 *     rotation until it becomes ready again.
 *     Checks: MongoDB connection state, Redis ping latency.
 *
 * # ALB / NGINX Health Check Configuration
 *
 *   AWS ALB:  Health check path: /health/ready, threshold: 2 consecutive 200s
 *   NGINX:    health_check uri=/health/ready interval=15 fails=3 passes=2;
 *   Docker:   HEALTHCHECK --interval=15s CMD wget -qO- http://localhost:8000/health/ready
 *
 * # Process Type Metadata
 *
 *   Both endpoints include `processType` in the response for debugging multi-instance
 *   deployments — makes it easy to identify which container served a health check.
 */

import mongoose from "mongoose";
import getRedisClient from "../lib/redis.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { getCircuitBreakerStats } from "../utils/razorpayBreaker.js";

// ─── Liveness Probe ───────────────────────────────────────────────────────────

/**
 * GET /health/live
 *
 * Returns 200 if the process is alive and event loop is responsive.
 * Designed to be extremely cheap — no I/O, no downstream checks.
 * Kubernetes restarts the container if this returns non-200 or times out.
 */
export const getLiveness = asyncHandler(async (req, res) => {
  const healthData = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    memoryUsageMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    environment: process.env.NODE_ENV || "development",
    processType: process.env.PROCESS_TYPE || "all",
    version: "1.0.0",
  };

  return res.status(200).json(new ApiResponse(200, healthData, "Service is alive"));
});

// ─── Readiness Probe ──────────────────────────────────────────────────────────

/**
 * GET /health/ready
 *
 * Returns 200 only if MongoDB and Redis are both reachable.
 * Kubernetes removes the pod from the load balancer on non-200.
 * During rolling deployments, this probe prevents traffic from being sent to
 * a pod before it has established its DB and Redis connections.
 *
 * Redis check is non-blocking with a 500ms timeout — Redis being unavailable
 * returns a degraded (but non-critical) status. MongoDB unavailability returns 503.
 */
export const getReadiness = asyncHandler(async (req, res) => {
  const checks = {};
  let isReady = true;

  // ── MongoDB check ────────────────────────────────────────────────────────
  const mongoReadyState = mongoose.connection.readyState;
  checks.mongo = mongoReadyState === 1 ? "connected" : "disconnected";

  if (mongoReadyState !== 1) {
    isReady = false;
  }

  // ── Redis check ──────────────────────────────────────────────────────────
  if (process.env.NODE_ENV === "test" && !process.env.USE_REDIS_IN_TESTS) {
    checks.redis = { status: "skipped_in_test" };
  } else {
    const redis = getRedisClient();
    if (!redis) {
      checks.redis = { status: "unavailable" };
    } else {
      try {
        const pingStart = Date.now();
        const pingResult = await Promise.race([
          redis.ping(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), 500)
          ),
        ]);
        const pingLatencyMs = Date.now() - pingStart;
        checks.redis = {
          status: pingResult === "PONG" ? "connected" : "degraded",
          latencyMs: pingLatencyMs,
        };
      } catch (err) {
        checks.redis = { status: "error", error: err.message };
        // Redis being down is degraded but not fatal — rate limiting falls back to allow-all
        // and cache falls back to DB reads. Booking locks DO require Redis, so if Redis
        // is down, bookings will fail with LOCK_SERVICE_UNAVAILABLE — but API is still "ready"
        // in the sense that other non-booking endpoints still work.
      }
    }
  }

  // ── BullMQ / Worker-specific checks ─────────────────────────────────────
  const processType = process.env.PROCESS_TYPE || "all";
  checks.processType = processType;

  // ── Circuit Breaker States ────────────────────────────────────────────────
  // Report breaker states inline — any OPEN breaker is a degraded dependency
  try {
    const breakerStats = getCircuitBreakerStats();
    checks.razorpayBreakers = breakerStats;
    // An open breaker means Razorpay is unreachable — mark as degraded
    const hasOpenBreaker = Object.values(breakerStats).some((b) => b.state === "open");
    if (hasOpenBreaker) {
      checks.razorpayBreakerAlert = "One or more Razorpay circuit breakers are OPEN";
    }
  } catch {
    checks.razorpayBreakers = { status: "unavailable" };
  }

  const statusCode = isReady ? 200 : 503;
  const message = isReady ? "Service is ready" : "Service is not ready — dependency check failed";

  return res.status(statusCode).json(
    new ApiResponse(
      statusCode,
      {
        status: isReady ? "ready" : "not_ready",
        timestamp: new Date().toISOString(),
        processType,
        dependencies: checks,
      },
      message
    )
  );
});
