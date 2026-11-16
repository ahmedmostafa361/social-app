import http from "node:http";
import { createApp } from "./app.js";
import { env } from "./lib/config/env.js";
import { cacheProvider } from "./lib/cache/cache.js";
import { connectDB, disconnectDB } from "./lib/db/connection.js";
import { logger } from "./pkg/logger/logger.js";

const server = http.createServer(createApp());

let shuttingDown = false;

function shutdown(signal: string, exitCode = 0): void {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} received, shutting down`);

    server.close(() => {
        void Promise.allSettled([disconnectDB(), cacheProvider.disconnect()]).then(() => process.exit(exitCode));
    });

    setTimeout(() => process.exit(1), 10_000).unref();
}

async function start(): Promise<void> {
    await Promise.all([connectDB(), cacheProvider.connect()]);
    server.listen(env.port, () => {
        logger.info(`Server running on port ${env.port}`, { env: env.nodeEnv });
    });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (reason: unknown) => {
    logger.error("Unhandled promise rejection", {
        reason: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
    });
});
process.on("uncaughtException", (error: Error) => {
    logger.error("Uncaught exception", { error: error.message, stack: error.stack });
    shutdown("uncaughtException", 1);
});

start().catch((error: unknown) => {
    logger.error("Failed to start server", { error: error instanceof Error ? error.message : String(error) });
    process.exit(1);
});
