import type { NextFunction, Request, RequestHandler, Response } from "express";
import { cacheProvider } from "../cache/cache.js";
import { logger } from "../../pkg/logger/logger.js";
import { AppError } from "../errors/app.error.js";

type IdentityResolver = (req: Request) => string;

interface RateLimitOptions {
    name: string;
    windowSeconds: number;
    max: number;
    identity?: IdentityResolver;
    message?: string;
}

const defaultIdentity: IdentityResolver = (req) => (req.user ? `user:${req.user.userId}` : `ip:${req.ip}`);

export const byIpAndEmail: IdentityResolver = (req) => {
    const body: unknown = req.body;
    const email =
        typeof body === "object" && body !== null && "email" in body ? String(body.email).trim().toLowerCase() : "";
    return `ip:${req.ip}:email:${email}`;
};

export function rateLimit({
    name,
    windowSeconds,
    max,
    identity = defaultIdentity,
    message,
}: RateLimitOptions): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const key = `rate:${name}:${identity(req)}`;
        let count: number;

        try {
            count = await cacheProvider.increment(key);
            if (count === 1) await cacheProvider.expire(key, windowSeconds);
        } catch (error) {
            logger.warn("Rate limiter unavailable, allowing request", {
                name,
                error: error instanceof Error ? error.message : String(error),
            });
            next();
            return;
        }

        res.setHeader("X-RateLimit-Limit", String(max));
        res.setHeader("X-RateLimit-Remaining", String(Math.max(max - count, 0)));

        if (count <= max) {
            next();
            return;
        }

        let retryAfterSeconds = windowSeconds;
        try {
            const ttl = await cacheProvider.ttl(key);
            if (ttl > 0) retryAfterSeconds = ttl;
            else await cacheProvider.expire(key, windowSeconds);
        } catch {
            retryAfterSeconds = windowSeconds;
        }

        next(
            new AppError(message ?? "Too many requests. Please try again later", 429, {
                code: "RATE_LIMITED",
                details: { retryAfterSeconds },
            })
        );
    };
}
