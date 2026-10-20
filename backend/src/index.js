/**
 * index.js — Application bootstrap with PROCESS_TYPE routing.
 *
 * # Process Architecture (S1 Fix)
 *
 * The previous architecture ran API server + all BullMQ workers + Socket.io + outbox relay
 * in a single Node.js process. This creates several scalability problems:
 *
 *   1. CPU contention: A worker retry loop or heavy report generation starves the API event loop.
 *   2. Horizontal scaling confusion: Scaling API replicas also scales workers N×, duplicating
 *      background job processing without queue isolation.
 *   3. Memory pressure: All concerns compete for the same Node.js heap.
 *
 * # PROCESS_TYPE Environment Variable
 *
 *   api    — Start HTTP server + Socket.io only. No background workers.
 *   worker — Start BullMQ workers + Outbox relay only. No HTTP server, no WebSocket.
 *   all    — Start everything (backward-compatible local development mode, default).
 *
 * # Deployment Pattern
 *
 *   Container A (replicated N×):  PROCESS_TYPE=api    → API cluster
 *   Container B (replicated M×):  PROCESS_TYPE=worker → Worker cluster
 *
 * # Backward Compatibility
 *
 *   PROCESS_TYPE defaults to "all" — existing single-server deployments continue
 *   to work without any configuration changes.
 *
 * # Change Stream Note
 *
 *   The MongoDB ChangeStream (holdWatcher) acts as a fallback hold-expiry mechanism.
 *   It is only started when PROCESS_TYPE=worker or PROCESS_TYPE=all, since
 *   it consumes a MongoDB change stream slot per process.
 *
 * Scalability Invariants Satisfied:
 *   - I1:  API processes are stateless and horizontally scalable independently.
 *   - I6:  Worker processes scale independently from API processes.
 *   - I9:  No single process is responsible for both API and background processing.
 *   - I11: Graceful shutdown drains in-flight requests before terminating.
 */

import "./loadEnv.js";
import { createServer } from "http";
import mongoose from "mongoose";
import connectDB from "./db/index.js";
import app from "./app.js";
import { initializeSocket, shutdownSocketServer } from "./socket.js";
import { verifyEmailService } from "./utils/mailer.js";
import { startHoldWatcher } from "./changeStreams/holdWatcher.js";
import { createHoldExpiryWorker, closeHoldExpiryWorker } from "./workers/holdExpiry.worker.js";
import { createPaymentRecoveryWorker, closePaymentRecoveryWorker } from "./workers/paymentRecovery.worker.js";
import { startOutboxRelayWorker, stopOutboxRelayWorker } from "./workers/outboxRelay.worker.js";
import { subscribeCacheInvalidation } from "./lib/cacheManager.js";
import getRedisClient from "./lib/redis.js";
import logger from "./lib/logger.js";

// Environment variables loaded via ./loadEnv.js

// ─── Process type ─────────────────────────────────────────────────────────────
const PROCESS_TYPE = (process.env.PROCESS_TYPE || "all").toLowerCase();
const isApi = PROCESS_TYPE === "api" || PROCESS_TYPE === "all";
const isWorker = PROCESS_TYPE === "worker" || PROCESS_TYPE === "all";

// ─── Required environment assertions (fail-closed startup) ────────────────────
const requiredEnvVars = ["ACCESS_TOKEN_SECRET", "REFRESH_TOKEN_SECRET"];
if (process.env.NODE_ENV === "production") {
  requiredEnvVars.push(
    "RAZORPAY_KEY_ID",
    "RAZORPAY_KEY_SECRET",
    "RAZORPAY_WEBHOOK_SECRET",
    "INTERNAL_CRON_SECRET"
  );
} else {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    logger.warn("[Startup] RAZORPAY_WEBHOOK_SECRET is not set in development — payment webhooks will fail HMAC verification");
  }
}

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    logger.error({ envVar }, "FATAL STARTUP ERROR: Required environment variable is missing — exiting");
    process.exit(1);
  }
}

logger.info({ processType: PROCESS_TYPE, isApi, isWorker }, "SalonNow bootstrap starting");

// ─── HTTP Server (API + Socket.io) ────────────────────────────────────────────
let server = null;

// ─── Cache Invalidation Subscriber ───────────────────────────────────────────
let cacheSubscriber = null;

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
let isShuttingDown = false;

export const gracefulShutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info({ signal }, "Received shutdown signal. Starting graceful shutdown...");

  // Step 1: Stop accepting new HTTP connections (allow in-flight requests to drain)
  if (server) {
    await new Promise((resolve) => {
      server.close(() => {
        logger.info("HTTP server closed — no new connections accepted");
        resolve();
      });
    });
  }

  // Step 2: Close Socket.io server and its Redis pub/sub pair
  try {
    await shutdownSocketServer();
  } catch (err) {
    logger.warn({ err: err.message }, "Socket.io shutdown warning");
  }

  // Step 3: Stop background workers gracefully (allow in-progress jobs to finish)
  if (isWorker) {
    try {
      stopOutboxRelayWorker();
      await Promise.allSettled([
        closeHoldExpiryWorker(),
        closePaymentRecoveryWorker(),
      ]);
      logger.info("Background workers closed");
    } catch (err) {
      logger.error({ err: err.message }, "Error closing background workers");
    }
  }

  // Step 4: Close cache invalidation subscriber
  if (cacheSubscriber) {
    try {
      await cacheSubscriber.quit();
      logger.info("Cache invalidation subscriber closed");
    } catch (err) {
      logger.warn({ err: err.message }, "Cache invalidation subscriber shutdown warning");
    }
  }

  // Step 5: Close application Redis client
  try {
    const redis = getRedisClient();
    if (redis) {
      await redis.quit();
      logger.info("Application Redis connection closed");
    }
  } catch (err) {
    logger.warn({ err: err.message }, "Redis shutdown warning");
  }

  // Step 6: Close MongoDB connection pool (allow in-flight queries to complete)
  try {
    await mongoose.connection.close(false);
    logger.info("MongoDB connection pool closed");
  } catch (err) {
    logger.error({ err: err.message }, "MongoDB shutdown error");
  }

  logger.info("Graceful shutdown complete");

  // Force exit after 30 seconds if still hanging (e.g. zombie connections)
  setTimeout(() => {
    logger.warn("Forced exit after shutdown timeout — zombie connections detected");
    process.exit(1);
  }, 30_000).unref();
};

// ─── OS Signal Handlers ───────────────────────────────────────────────────────
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("uncaughtException", (err) => {
  logger.error({ err: err.message, stack: err.stack }, "Uncaught Exception — shutting down");
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled Promise Rejection — shutting down");
  gracefulShutdown("unhandledRejection");
});

// ─── Application Bootstrap ────────────────────────────────────────────────────
connectDB()
  .then(async () => {
    logger.info("[Bootstrap] MongoDB connected");

    // ── Cache Invalidation Pub/Sub (all process types that use the cache) ───
    if (isApi) {
      // API processes subscribe so their L1 caches are cleared on invalidation events
      cacheSubscriber = subscribeCacheInvalidation();
    }

    // ── API Server & Socket.io ────────────────────────────────────────────
    if (isApi) {
      server = createServer(app);

      // initializeSocket is now async (awaits Redis adapter connection)
      await initializeSocket(server);

      server.on("error", (error) => {
        logger.error({ err: error.message }, "HTTP server error");
        process.exit(1);
      });

      const port = parseInt(process.env.PORT || "8000", 10);
      server.listen(port, () => {
        logger.info({ port, processType: PROCESS_TYPE }, "HTTP server listening");
        verifyEmailService().catch(function(err) { logger.error({ err: err && err.message }, "[Bootstrap] Email service verification failed - continuing without email"); });
      });
    }

    // ── Background Workers ────────────────────────────────────────────────
    if (isWorker) {
      // MongoDB ChangeStream: fallback hold-expiry in case BullMQ misses a job
      // Only one worker process should run this — use ENABLE_HOLD_WATCHER=true
      if (process.env.ENABLE_HOLD_WATCHER !== "false") {
        startHoldWatcher();
      }

      startOutboxRelayWorker();
      if (process.env.ENABLE_REDIS !== "false") {
        createHoldExpiryWorker();
        createPaymentRecoveryWorker();
      } else {
        logger.info("[Bootstrap] Redis disabled (ENABLE_REDIS=false) — skipping BullMQ workers; MongoDB holdWatcher active");
      }

      logger.info("[Bootstrap] Background workers started");
    }

    logger.info(
      {
        processType: PROCESS_TYPE,
        apiStarted: isApi,
        workersStarted: isWorker,
      },
      "[Bootstrap] SalonNow ready"
    );
  })
  .catch((error) => {
    logger.error({ err: error.message }, "[Bootstrap] MongoDB connection failed — exiting");
    process.exit(1);
  });
