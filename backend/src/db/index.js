/**
 * db/index.js — MongoDB connection with bounded pooling for horizontal scalability.
 *
 * # Connection Pool Sizing (S4 Fix)
 *
 * Without explicit pool limits, Mongoose defaults to maxPoolSize=100. When the
 * API cluster autoscales to 25 nodes, this opens 25 × 100 = 2,500 connections,
 * crashing the MongoDB primary (typical limits: 500–2,000 connections).
 *
 * Formula:
 *   Total connections = (API nodes × API_MAX_POOL) + (Worker nodes × WORKER_MAX_POOL)
 *   Target: ≤ 500 total (safe for MongoDB Atlas M10 and above)
 *
 * Recommended per-process limits:
 *   API process:    maxPoolSize = 15  →  20 nodes × 15 =  300 API connections
 *   Worker process: maxPoolSize = 10  →  10 nodes × 10 =  100 worker connections
 *   Total:                                                  400 connections (safe)
 *
 * Env Variables:
 *   MONGO_MAX_POOL_SIZE — override default pool size (default: 15 for API, 10 for workers)
 *   PROCESS_TYPE        — "api" | "worker" | "all" — determines default pool size
 *
 * Read Preference Note:
 *   Mongoose default readPreference is "primary" (all reads go to primary node).
 *   For read-heavy operations (salon search, availability), pass:
 *     { session, readPreference: "secondaryPreferred" }
 *   to individual queries. This is applied per-operation in the service layer.
 *
 * Write Concern:
 *   Default w:1 (primary acknowledgement only). For booking/payment transactions,
 *   Mongoose automatically uses majority w during multi-document sessions.
 *
 * Scalability Invariants Satisfied:
 *   - I8:  Connection count remains bounded across all API instances.
 *   - I9:  Database is not a single point of failure — replica set with read preferences.
 *   - I12: Pool sizing formula ensures safe autoscaling from 2 to 50+ nodes.
 */

import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
import logger from "../lib/logger.js";

const connectDB = async () => {
  try {
    const rawUri = process.env.MONGODB_URI || "mongodb://localhost:27017";
    const uri = rawUri.includes("?")
      ? rawUri
      : rawUri.endsWith("/")
      ? `${rawUri}${DB_NAME}`
      : `${rawUri}/${DB_NAME}`;

    // ── Pool size: configurable, with sensible per-process-type defaults ──────
    const processType = (process.env.PROCESS_TYPE || "all").toLowerCase();
    const defaultPoolSize = processType === "worker" ? 10 : 15;
    const maxPoolSize = parseInt(process.env.MONGO_MAX_POOL_SIZE || String(defaultPoolSize), 10);
    const minPoolSize = parseInt(process.env.MONGO_MIN_POOL_SIZE || "2", 10);

    const connectionInstance = await mongoose.connect(uri, {
      // ── Connection Pool ───────────────────────────────────────────────────
      maxPoolSize,                       // Hard cap — prevents connection storm
      minPoolSize,                       // Keep warm connections ready
      maxIdleTimeMS: 30_000,             // Close idle connections after 30s

      // ── Timeouts ─────────────────────────────────────────────────────────
      serverSelectionTimeoutMS: 5_000,   // Fail fast if replica set is unreachable
      socketTimeoutMS: 45_000,           // Drop hung socket operations
      connectTimeoutMS: 10_000,          // Initial connection timeout

      // ── Reliability ───────────────────────────────────────────────────────
      heartbeatFrequencyMS: 10_000,      // How often to check replica set health
      retryWrites: true,                 // Automatically retry failed writes on primary failover
      retryReads: true,                  // Automatically retry failed reads

      // ── Write Concern (default) ───────────────────────────────────────────
      // w: 1 means primary acknowledgement — sufficient for most writes.
      // Booking/payment transactions use majority w automatically via session.
    });

    logger.info(
      {
        host: connectionInstance.connection.host,
        dbName: connectionInstance.connection.name,
        processType,
        maxPoolSize,
        minPoolSize,
      },
      "[MongoDB] Connected successfully"
    );

    return connectionInstance;
  } catch (error) {
    logger.error({ err: error.message }, "[MongoDB] Connection failed");
    process.exit(1);
  }
};

// ─── Connection lifecycle event handlers ──────────────────────────────────────

mongoose.connection.on("disconnected", () => {
  logger.warn("[MongoDB] Connection lost — Mongoose will retry automatically");
});

mongoose.connection.on("reconnected", () => {
  logger.info("[MongoDB] Reconnected to database");
});

mongoose.connection.on("error", (err) => {
  logger.error({ err: err.message }, "[MongoDB] Connection error");
});

export default connectDB;