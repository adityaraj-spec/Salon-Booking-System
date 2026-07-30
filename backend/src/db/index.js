import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  try {
    const rawUri = process.env.MONGODB_URI || "mongodb://localhost:27017";
    const uri = rawUri.includes("?")
      ? rawUri
      : rawUri.endsWith("/")
      ? `${rawUri}${DB_NAME}`
      : `${rawUri}/${DB_NAME}`;

    const connectionInstance = await mongoose.connect(uri, {
      maxPoolSize: 50,
      minPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`);
    return connectionInstance;
  } catch (error) {
    console.error("MONGODB CONNECTION error ", error);
    process.exit(1);
  }
};

export default connectDB;