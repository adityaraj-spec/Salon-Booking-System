import mongoose from "mongoose";
import { BookingHold } from "../models/bookingHold.model.js";
import { Booking } from "../models/booking.models.js";
import { expireHold } from "../services/hold.service.js";
import { expirePendingBooking } from "../services/booking.service.js";
import logger from "../lib/logger.js";

/**
 * Monitors the bookingholds and bookings collections for real-time state changes and automated expiry cleanup.
 * Acts as a fallback mechanism in case BullMQ misses a hold-expiry job.
 */
export const startHoldWatcher = () => {
  try {
    const holdChangeStream = BookingHold.watch([], { fullDocument: "updateLookup" });

    holdChangeStream.on("change", async (change) => {
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

    holdChangeStream.on("error", (error) => {
      logger.error({ err: error.message }, "[ChangeStream] BookingHold watcher error");
    });

    const bookingChangeStream = Booking.watch([], { fullDocument: "updateLookup" });

    bookingChangeStream.on("change", async (change) => {
      if (change.operationType === "insert" || change.operationType === "update") {
        const fullDoc = change.fullDocument;
        if (fullDoc && fullDoc.status === "pending_payment" && fullDoc.holdExpiresAt) {
          const now = new Date();
          const expiresAt = new Date(fullDoc.holdExpiresAt);
          if (expiresAt <= now) {
            logger.info({ bookingId: fullDoc._id }, "[ChangeStream] Pending payment booking reached expiration time — expiring");
            await expirePendingBooking(fullDoc._id.toString()).catch((err) =>
              logger.error({ bookingId: fullDoc._id, err: err.message }, "[ChangeStream] Booking expire error")
            );
          }
        }
      }
    });

    bookingChangeStream.on("error", (error) => {
      logger.error({ err: error.message }, "[ChangeStream] Booking watcher error");
    });

    logger.info("[ChangeStream] MongoDB ChangeStream watchers initialized for BookingHold and Booking collections");
  } catch (err) {
    logger.warn({ err: err.message }, "[ChangeStream] Could not start hold watcher (requires replica set)");
  }
};
