import dns from "node:dns";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { logger } from "../../pkg/logger/logger.js";

if (env.db.url.startsWith("mongodb+srv://")) {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

mongoose.set("strictQuery", true);

let connecting: Promise<typeof mongoose> | null = null;

export async function connectDB(): Promise<typeof mongoose> {
    if (mongoose.connection.readyState === 1) return mongoose;

    if (!connecting) {
        connecting = mongoose
            .connect(env.db.url, { serverSelectionTimeoutMS: 10_000 })
            .then((connection) => {
                logger.info("Connected to MongoDB");
                return connection;
            })
            .catch((error: unknown) => {
                connecting = null;
                const message = error instanceof Error ? error.message : String(error);
                logger.error("MongoDB connection error", { error: message });
                throw error;
            });
    }

    return connecting;
}

export async function disconnectDB(): Promise<void> {
    connecting = null;
    await mongoose.disconnect();
}
