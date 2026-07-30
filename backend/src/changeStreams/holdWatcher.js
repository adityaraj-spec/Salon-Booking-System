import mongoose from "mongoose";
import { BookingHold } from "../models/bookingHold.model.js";
import { expireHold } from "../services/hold.service.js";

/**
 * Monitors the bookingholds collection for real-time state changes and automated expiry cleanup.
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
            console.log(`[ChangeStream] Active hold ${fullDoc._id} reached expiration time. Expiring...`);
            await expireHold(fullDoc._id.toString()).catch((err) =>
              console.error("[ChangeStream] Expire error:", err.message)
            );
          }
        }
      }
    });

    changeStream.on("error", (error) => {
      console.error("[ChangeStream] BookingHold watcher error:", error.message);
    });

    console.log("MongoDB ChangeStream watcher initialized for BookingHold collection.");
  } catch (err) {
    console.warn("[ChangeStream] Could not start hold watcher (requires replica set):", err.message);
  }
};
