import { Worker } from "bullmq";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { expireHold } from "../services/hold.service.js";

dotenv.config({ path: "./.env" });

const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
};

const connectMongo = async () => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/salonnow?replicaSet=rs0";
  await mongoose.connect(mongoUri);
  console.log("Hold Expiry Worker: connected to MongoDB");
};

const startWorker = async () => {
  await connectMongo();

  const worker = new Worker(
    "hold-expiry",
    async (job) => {
      console.log(`Processing hold expiry job for holdId: ${job.data.holdId}`);
      await expireHold(job.data.holdId);
    },
    { connection: redisConnection }
  );

  worker.on("completed", (job) => {
    console.log(`Hold expiry job ${job.id} completed successfully.`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Hold expiry job ${job?.id} failed with error:`, err);
  });

  console.log("Hold Expiry Worker started and waiting for jobs...");
};

startWorker().catch((err) => {
  console.error("Worker startup failed:", err);
  process.exit(1);
});
