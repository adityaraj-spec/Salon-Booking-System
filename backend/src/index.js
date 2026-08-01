import dotenv from "dotenv";
import { createServer } from "http";
import mongoose from "mongoose";
import connectDB from "./db/index.js";
import app from "./app.js";
import { initializeSocket } from "./socket.js";
import { verifyTransporter } from "./utils/mailer.js";
import { startHoldWatcher } from "./changeStreams/holdWatcher.js";
import { createHoldExpiryWorker, closeHoldExpiryWorker } from "./workers/holdExpiry.worker.js";
import { createPaymentRecoveryWorker, closePaymentRecoveryWorker } from "./workers/paymentRecovery.worker.js";
import getRedisClient from "./lib/redis.js";
import logger from "./lib/logger.js";

dotenv.config({ path: "./.env" });

const server = createServer(app);
initializeSocket(server);

let isShuttingDown = false;

export const gracefulShutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info({ signal }, "Received signal. Starting graceful shutdown...");

  // Step 1: Stop accepting new HTTP connections
  server.close(async () => {
    logger.info("HTTP server closed.");
  });

  try {
    // Step 2: Close BullMQ workers (let in-flight jobs finish, up to 30s)
    await Promise.allSettled([
      closeHoldExpiryWorker(),
      closePaymentRecoveryWorker(),
    ]);
    logger.info("BullMQ workers closed.");

    // Step 3: Close Redis connection
    const redis = getRedisClient();
    if (redis) {
      await redis.quit();
      logger.info("Redis connection closed.");
    }

    // Step 4: Close MongoDB connection pool
    await mongoose.connection.close(false);
    logger.info("MongoDB connection pool closed.");
  } catch (err) {
    logger.error({ err: err.message }, "Error during graceful shutdown");
  }

  // Force exit after 30 seconds if still hanging
  setTimeout(() => {
    logger.warn("Forced exit after shutdown timeout.");
    process.exit(1);
  }, 30_000).unref();
};

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

connectDB()
  .then(() => {
    // Start MongoDB change stream for hold expiry fallback
    startHoldWatcher();

    // Gap X.2: Start BullMQ workers in the main process
    createHoldExpiryWorker();
    createPaymentRecoveryWorker();

    server.on("error", (error) => {
      logger.error({ err: error.message }, "HTTP server error");
      process.exit(1);
    });

    server.listen(process.env.PORT || 8000, () => {
      logger.info({ port: process.env.PORT || 8000 }, "App is listening");
      verifyTransporter();
    });
  })
  .catch((error) => {
    logger.error({ err: error.message }, "MongoDB connection failed");
    process.exit(1);
  });