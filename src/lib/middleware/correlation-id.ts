import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const validId = /^[a-zA-Z0-9-]{8,64}$/;

export function correlationId(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.headers["x-correlation-id"];
    const id = typeof incoming === "string" && validId.test(incoming) ? incoming : crypto.randomUUID();
    req.correlationId = id;
    res.setHeader("X-Correlation-ID", id);
    next();
}
