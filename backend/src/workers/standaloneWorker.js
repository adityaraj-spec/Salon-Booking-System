/**
 * standaloneWorker.js — Dedicated background worker process entry point.
 *
 * This file is the entry point for containerized worker deployments.
 * It bootstraps ONLY the background processing layer:
 *   - MongoDB connection (for Outbox relay reads/writes, hold/booking updates)
 *   - BullMQ HoldExpiry worker
 *   - BullMQ PaymentRecovery worker
 *   - Outbox Relay worker (polling-based, atomic claim via findOneAndUpdate)
 *   - MongoDB ChangeStream (optional fallback hold watcher)
 *
 * It intentionally does NOT start an HTTP server or Socket.io server.
 * Workers communicate booking state changes via MongoDB outbox events,
 * which the Outbox relay then dispatches as Socket.io notifications through
 * any running API server's Redis adapter.
 *
 * # Usage
 *
 *   Direct:      node src/workers/standaloneWorker.js
 *   Docker:      CMD ["node", "src/workers/standaloneWorker.js"]
 *   Env override: PROCESS_TYPE=worker node src/index.js (equivalent via main index.js)
 *
 * # Scaling
 *
 *   Run as many replicas of this container as needed:
 *     - BullMQ workers claim jobs atomically via Redis BLPOP — no duplicate processing.
 *     - Outbox relay instances claim events atomically via MongoDB findOneAndUpdate — no duplicate dispatch.
 *     - MongoDB pool per worker = MONGO_MAX_POOL_SIZE (default: 10 for worker processes).
 *
 * Scalability Invariants Satisfied:
 *   - I6: Workers scale horizontally without coordination overhead.
 *   - I8: Exactly-once processing guaranteed by BullMQ job locking + idempotent handlers.
 *   - I9: Worker crashes don't affect API availability — they are separate processes.
 */

import "../loadEnv.js";
import mongoose from "mongoose";
import connectDB from "../db/index.js";
import { startHoldWatcher } from "../changeStreams/holdWatcher.js";
import { createHoldExpiryWorker, closeHoldExpiryWorker } from "./holdExpiry.worker.js";
import { createPaymentRecoveryWorker, closePaymentRecoveryWorker } from "./paymentRecovery.worker.js";
import { startOutboxRelayWorker, stopOutboxRelayWorker } from "./outboxRelay.worker.js";
import getRedisClient from "../lib/redis.js";
import logger from "../lib/logger.js";

// Environment variables loaded via ../loadEnv.js

// Force process type to worker — affects DB pool sizing in db/index.js
process.env.PROCESS_TYPE = "worker";

// ─── Required environment assertions ─────────────────────────────────────────
const requiredEnvVars = ["ACCESS_TOKEN_SECRET", "REFRESH_TOKEN_SECRET"];
if (process.env.NODE_ENV === "production") {
  requiredEnvVars.push("RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET");
}

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    logger.error({ envVar }, "FATAL: Required environment variable missing — worker startup aborted");
    process.exit(1);
  }
}

logger.info("[StandaloneWorker] Starting background worker process");

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
let isShuttingDown = false;

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, "[StandaloneWorker] Received shutdown signal — draining jobs...");

  // Step 1: Stop accepting new outbox events (polling loop exits gracefully)
  stopOutboxRelayWorker();

  // Step 2: Close BullMQ workers (waits for in-progress jobs to finish)
  await Promise.allSettled([
    closeHoldExpiryWorker(),
    closePaymentRecoveryWorker(),
  ]);
  logger.info("[StandaloneWorker] BullMQ workers closed");

  // Step 3: Close application Redis client
  try {
    const redis = getRedisClient();
    if (redis) {
      await redis.quit();
      logger.info("[StandaloneWorker] Redis connection closed");
    }
  } catch (err) {
    logger.warn({ err: err.message }, "[StandaloneWorker] Redis shutdown warning");
  }

  // Step 4: Close MongoDB connection pool
  try {
    await mongoose.connection.close(false);
    logger.info("[StandaloneWorker] MongoDB connection closed");
  } catch (err) {
    logger.error({ err: err.message }, "[StandaloneWorker] MongoDB shutdown error");
  }

  logger.info("[StandaloneWorker] Shutdown complete");

  setTimeout(() => {
    logger.warn("[StandaloneWorker] Forced exit after shutdown timeout");
    process.exit(1);
  }, 30_000).unref();
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("uncaughtException", (err) => {
  logger.error({ err: err.message, stack: err.stack }, "[StandaloneWorker] Uncaught Exception");
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "[StandaloneWorker] Unhandled Promise Rejection");
  gracefulShutdown("unhandledRejection");
});

// ─── Worker Bootstrap ─────────────────────────────────────────────────────────
connectDB()
  .then(() => {
    logger.info("[StandaloneWorker] MongoDB connected");

    // MongoDB ChangeStream hold watcher (fallback expiry mechanism)
    // Set ENABLE_HOLD_WATCHER=false to disable when multiple worker replicas are running
    // (only one replica needs the watcher — BullMQ handles the primary expiry)
    if (process.env.ENABLE_HOLD_WATCHER !== "false") {
      startHoldWatcher();
    }

    // Start all workers
    startOutboxRelayWorker();
    createHoldExpiryWorker();
    createPaymentRecoveryWorker();

    logger.info("[StandaloneWorker] All workers started and ready");
  })
  .catch((error) => {
    logger.error({ err: error.message }, "[StandaloneWorker] MongoDB connection failed — exiting");
    process.exit(1);
  });
