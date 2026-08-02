import mongoose from "mongoose";
import { BookingHold } from "../models/bookingHold.model.js";
import { expireHold } from "../services/hold.service.js";
import logger from "../lib/logger.js";

/**
 * Monitors the bookingholds collection for real-time state changes and automated expiry cleanup.
 * Acts as a fallback mechanism in case BullMQ misses a hold-expiry job.
 */
export const startHoldWatcher = () => {
  try {
    const changeStream = BookingHold.watch([], { fullDocument: "updateLookup" });

    changeStream.on("change", async (change) => {
      if (change.operationType === "insert" || change.operationType === "update") {
        const fullDoc = change.fullDocument;
        if (fullDoc && fullDoc.status === "active") {
          const now = new Date();
          const expiresAt = new Date(fullDoc.expiresAt);
          if (expiresAt <= now) {
            logger.info({ holdId: fullDoc._id }, "[ChangeStream] Active hold reached expiration time — expiring");
            await expireHold(fullDoc._id.toString()).catch((err) =>
              logger.error({ holdId: fullDoc._id, err: err.message }, "[ChangeStream] Expire error")
            );
          }
        }
      }
    });

    changeStream.on("error", (error) => {
      logger.error({ err: error.message }, "[ChangeStream] BookingHold watcher error");
    });

    logger.info("[ChangeStream] MongoDB ChangeStream watcher initialized for BookingHold collection");
  } catch (err) {
    logger.warn({ err: err.message }, "[ChangeStream] Could not start hold watcher (requires replica set)");
  }
};
