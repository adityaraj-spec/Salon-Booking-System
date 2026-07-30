import mongoose from "mongoose";
import dotenv from "dotenv";
import { Salon } from "../models/salon.models.js";

dotenv.config({ path: "./.env" });

const backfillTimezone = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/salonnow";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB for backfill...");

    const result = await Salon.updateMany(
      { timezone: { $exists: false } },
      { $set: { timezone: "Asia/Kolkata" } }
    );

    console.log(`Backfill complete. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Backfill failed:", error);
    process.exit(1);
  }
};

backfillTimezone();
