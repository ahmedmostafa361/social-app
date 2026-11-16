import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { logger } from "../../pkg/logger/logger.js";
import { AppError } from "./app.error.js";

interface MongoLikeError {
    name?: string;
    code?: number | string;
    type?: string;
    path?: string;
    keyValue?: Record<string, unknown>;
    keyPattern?: Record<string, unknown>;
    errors?: Record<string, { message: string }>;
    message?: string;
    stack?: string;
}

function normalizeError(error: unknown): AppError | null {
    if (error instanceof AppError) return error;
    if (typeof error !== "object" || error === null) return null;

    const err = error as MongoLikeError;

    if (err.code === 11000) {
        const field = Object.keys(err.keyValue ?? err.keyPattern ?? {})[0] ?? "value";
        return new AppError(`This ${field} is already in use`, 409, { code: "DUPLICATE_KEY" });
    }

    if (err.name === "CastError") {
        return new AppError(`Invalid ${err.path ?? "value"}`, 400, { code: "INVALID_ID" });
    }

    if (err.name === "ValidationError" && err.errors) {
        const messages = Object.values(err.errors).map((item) => item.message);
        return new AppError(messages.join(", "), 400, { code: "VALIDATION_ERROR" });
    }

    if (err.type === "entity.parse.failed") {
        return new AppError("Request body is not valid JSON", 400, { code: "INVALID_JSON" });
    }

    if (err.type === "entity.too.large") {
        return new AppError("Request body is too large", 413, { code: "PAYLOAD_TOO_LARGE" });
    }

    return null;
}

export function globalErrorHandler(error: unknown, req: Request, res: Response, _next: NextFunction): void {
    const appError = normalizeError(error);
    const stack = error instanceof Error ? error.stack : undefined;
    const message = error instanceof Error ? error.message : String(error);

    if (!appError || appError.statusCode >= 500) {
        logger.error(message, { stack, correlationId: req.correlationId, path: req.originalUrl });
    } else {
        logger.warn(appError.message, {
            statusCode: appError.statusCode,
            correlationId: req.correlationId,
            path: req.originalUrl,
        });
    }

    if (!appError) {
        res.status(500).json({
            message: "Something went wrong",
            success: false,
            correlationId: req.correlationId,
            ...(env.isProduction ? {} : { stack }),
        });
        return;
    }

    const retryAfter = appError.details?.["retryAfterSeconds"];
    if (typeof retryAfter === "number") {
        res.setHeader("Retry-After", String(retryAfter));
    }

    res.status(appError.statusCode).json({
        message: appError.message,
        success: false,
        ...(appError.code ? { code: appError.code } : {}),
        ...(appError.details ? { details: appError.details } : {}),
        correlationId: req.correlationId,
    });
}

export function notFoundHandler(req: Request, res: Response): void {
    res.status(404).json({
        message: `Route ${req.method} ${req.originalUrl} not found`,
        success: false,
        code: "ROUTE_NOT_FOUND",
    });
}
