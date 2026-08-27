import mongoose from "mongoose";
import { logger } from "./logger";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export default async function dbConnect(): Promise<typeof mongoose> {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    logger.error("mongodb", "MONGODB_URI environment variable is not defined");
    throw new Error("Please define the MONGODB_URI environment variable");
  }

  if (cached.conn) {
    logger.debug("mongodb", "Using cached MongoDB connection");
    return cached.conn;
  }

  if (!cached.promise) {
    logger.info("mongodb", "Initiating new MongoDB connection...");
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  try {
    cached.conn = await cached.promise;
    logger.info("mongodb", "Successfully connected to MongoDB", { readyState: cached.conn.connection.readyState });
  } catch (e) {
    cached.promise = null;
    logger.error("mongodb", "Failed to connect to MongoDB", { error: (e as Error).message });
    throw e;
  }

  return cached.conn;
}
