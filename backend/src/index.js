import dotenv from "dotenv";
import { createServer } from "http";
import mongoose from "mongoose";
import connectDB from "./db/index.js";
import app from "./app.js";
import { initializeSocket } from "./socket.js";
import { verifyTransporter } from "./utils/mailer.js";
import { startHoldWatcher } from "./changeStreams/holdWatcher.js";

dotenv.config({
  path: "./.env",
});

const server = createServer(app);
initializeSocket(server);

let isShuttingDown = false;

export const gracefulShutdown = (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

  server.close(async () => {
    console.log("HTTP server closed.");
    try {
      await mongoose.connection.close(false);
      console.log("MongoDB connection pool closed.");
    } catch (err) {
      console.error("Error during graceful shutdown:", err);
    }
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

connectDB()
  .then(() => {
    startHoldWatcher();

    server.on("error", (error) => {
      console.log("Error", error);
      process.exit(1);
    });

    server.listen(process.env.PORT || 8000, () => {
      console.log(`App is listening on ${process.env.PORT || 8000}`);
      verifyTransporter();
    });
  })
  .catch((error) => {
    console.log("MongoDB connection failed!!", error);
  });