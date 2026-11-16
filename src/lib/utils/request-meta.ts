import type { Request } from "express";

export interface RequestMeta {
    ip: string | null;
    userAgent: string | null;
}

export const requestMeta = (req: Request): RequestMeta => ({
    ip: req.ip ?? null,
    userAgent: req.get("user-agent")?.slice(0, 512) ?? null,
});
