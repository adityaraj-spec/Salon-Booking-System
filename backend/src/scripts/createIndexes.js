import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { User } from "../models/user.models.js";
import { Salon } from "../models/salon.models.js";
import { Booking } from "../models/booking.models.js";
import { BookingHold } from "../models/bookingHold.model.js";
import { Review } from "../models/review.models.js";
import { Staff } from "../models/staff.models.js";
import { Payment } from "../models/payment.models.js";
import { OutboxEvent } from "../models/outboxEvent.model.js";
import { AuditLog } from "../models/auditLog.model.js";
import { LoyaltyTransaction } from "../models/loyaltyTransaction.models.js";
import { Notification } from "../models/notification.models.js";

const createAllIndexes = async () => {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/salonnow";
  console.log("Connecting to MongoDB for index build...", uri);
  await mongoose.connect(uri);

  const models = [
    User, Salon, Booking, BookingHold, Review,
    Staff, Payment, OutboxEvent, AuditLog, LoyaltyTransaction, Notification
  ];

  for (const model of models) {
    try {
      console.log(`Building indexes for ${model.modelName}...`);
      await model.createIndexes();
      console.log(`[SUCCESS] Indexes built for ${model.modelName}`);
    } catch (err) {
      console.error(`[ERROR] Building indexes for ${model.modelName}:`, err.message);
    }
  }

  await mongoose.disconnect();
  console.log("Index creation complete.");
};

if (process.argv[1] && process.argv[1].endsWith("createIndexes.js")) {
  createAllIndexes().catch(console.error);
}
