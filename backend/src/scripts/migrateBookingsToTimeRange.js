/**
 * Gap 2.4 — Migration Script: date+time strings → startTime+endTime ISODates
 *
 * Converts all existing Booking documents that have date+time string fields but
 * are missing startTime/endTime ISODate fields.
 *
 * Usage:
 *   node src/scripts/migrateBookingsToTimeRange.js           # dry-run (no writes)
 *   node src/scripts/migrateBookingsToTimeRange.js --execute  # actual migration
 *
 * Safe to run multiple times — only processes bookings where startTime is null.
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import { Booking } from "../models/booking.models.js";

dotenv.config({ path: "./.env" });

const EXECUTE = process.argv.includes("--execute");
const DEFAULT_DURATION_MINUTES = 30;
const DEFAULT_BUFFER_MINUTES = 15;

const parseBookingDateTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;
  try {
    // Support both "HH:MM" and "H:MM" formats
    const [h, m] = timeStr.split(":").map(Number);
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day, h, m));
  } catch {
    return null;
  }
};

const run = async () => {
  const mongoUri =
    process.env.MONGODB_URI || "mongodb://localhost:27017/salonnow?replicaSet=rs0";

  console.log(`[Migration] Connecting to: ${mongoUri.replace(/:\/\/[^@]+@/, "://*****@")}`);
  await mongoose.connect(mongoUri);
  console.log("[Migration] Connected to MongoDB");

  if (!EXECUTE) {
    console.log("[Migration] DRY-RUN mode — no writes will be made. Pass --execute to apply changes.\n");
  }

  // Find all bookings missing startTime but having date and time
  const bookings = await Booking.find({
    startTime: { $in: [null, undefined] },
    date: { $exists: true, $ne: null },
    time: { $exists: true, $ne: null },
  }).select("_id date time durationMinutes bufferMinutes");

  console.log(`[Migration] Found ${bookings.length} bookings to migrate.\n`);

  let succeeded = 0;
  let failed = 0;
  const failedIds = [];

  for (const booking of bookings) {
    const startTime = parseBookingDateTime(booking.date, booking.time);

    if (!startTime) {
      console.warn(`  ✗ [${booking._id}] Cannot parse date="${booking.date}" time="${booking.time}" — skipping`);
      failed++;
      failedIds.push({ id: booking._id.toString(), date: booking.date, time: booking.time });
      continue;
    }

    const durationWithBuffer =
      (booking.durationMinutes || DEFAULT_DURATION_MINUTES) +
      (booking.bufferMinutes || DEFAULT_BUFFER_MINUTES);
    const endTime = new Date(startTime.getTime() + durationWithBuffer * 60 * 1000);

    if (EXECUTE) {
      await Booking.updateOne(
        { _id: booking._id },
        { $set: { startTime, endTime } }
      );
    }

    console.log(
      `  ${EXECUTE ? "✓" : "~"} [${booking._id}] ${booking.date} ${booking.time} → ` +
        `startTime=${startTime.toISOString()} endTime=${endTime.toISOString()}`
    );
    succeeded++;
  }

  console.log(`\n[Migration] Summary:`);
  console.log(`  ✓ ${EXECUTE ? "Migrated" : "Would migrate"}: ${succeeded}`);
  console.log(`  ✗ Failed to parse: ${failed}`);

  if (failedIds.length > 0) {
    console.log("\n[Migration] Unparseable records requiring manual review:");
    failedIds.forEach((r) => console.log(`  - id=${r.id} date=${r.date} time=${r.time}`));
  }

  if (!EXECUTE) {
    console.log("\n[Migration] Re-run with --execute to apply changes.");
  } else {
    console.log("\n[Migration] Complete.");
  }

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error("[Migration] Fatal error:", err.message);
  process.exit(1);
});
