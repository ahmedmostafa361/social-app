import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { env } from "./lib/config/env.js";
import { globalErrorHandler, notFoundHandler } from "./lib/errors/error.handler.js";
import { correlationId } from "./lib/middleware/correlation-id.js";
import { router } from "./route.js";

export function createApp(): Express {
    const app = express();

    app.set("trust proxy", env.trustProxy ? 1 : false);
    app.disable("x-powered-by");

    app.use(correlationId);
    app.use(helmet());
    app.use(
        cors({
            origin: env.corsOrigins,
            credentials: true,
            exposedHeaders: ["X-Correlation-ID", "Retry-After", "X-RateLimit-Limit", "X-RateLimit-Remaining"],
        })
    );
    app.use(express.json({ limit: "100kb" }));
    app.use(cookieParser());

    app.get("/health", (_req, res) => {
        res.status(200).json({ message: "Server is running", success: true, uptime: process.uptime() });
    });

    app.use("/api", router);

    app.use(notFoundHandler);
    app.use(globalErrorHandler);

    return app;
}
