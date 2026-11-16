import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { ACCESS_COOKIE } from "../config/constants.js";
import { AppError } from "../errors/app.error.js";
import { verifyToken } from "../../pkg/utils/token.js";
import { sessionRepository } from "../../modules/auth/repository/session.repository.js";
import { userRepository } from "../../modules/user/repository/user.repository.js";

export interface AuthUser {
    userId: string;
    sessionId: string;
    email: string;
    userName: string;
}

interface AccessTokenPayload {
    sub?: string;
    sid?: string;
    type?: string;
}

const extractAccessToken = (req: Request): string | undefined => {
    const header = req.headers.authorization;
    if (typeof header === "string" && header.startsWith("Bearer ")) {
        const token = header.slice(7).trim();
        if (token) return token;
    }
    const cookies: Record<string, unknown> | undefined = req.cookies;
    const cookie = cookies?.[ACCESS_COOKIE];
    return typeof cookie === "string" && cookie ? cookie : undefined;
};

const decodeAccessToken = (token: string): { sub: string; sid: string } => {
    let payload: AccessTokenPayload;
    try {
        payload = verifyToken<AccessTokenPayload>(token, env.tokens.accessSecret);
    } catch (error) {
        if (error instanceof Error && error.name === "TokenExpiredError") {
            throw new AppError("Access token expired", 401, { code: "TOKEN_EXPIRED" });
        }
        throw new AppError("Invalid access token", 401, { code: "INVALID_TOKEN" });
    }

    if (payload.type !== "access" || !payload.sub || !payload.sid) {
        throw new AppError("Invalid access token", 401, { code: "INVALID_TOKEN" });
    }

    return { sub: payload.sub, sid: payload.sid };
};

const resolveUser = async (token: string): Promise<AuthUser> => {
    const { sub, sid } = decodeAccessToken(token);

    const [sessionActive, user] = await Promise.all([
        sessionRepository.isActive(sid, sub),
        userRepository.findActiveById(sub),
    ]);

    if (!sessionActive) {
        throw new AppError("Your session has ended. Please log in again", 401, { code: "SESSION_REVOKED" });
    }
    if (!user) {
        throw new AppError("Account not found", 401, { code: "ACCOUNT_NOT_FOUND" });
    }

    return {
        userId: String(user._id),
        sessionId: sid,
        email: user.email,
        userName: user.userName,
    };
};

export async function authGuard(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const token = extractAccessToken(req);
    if (!token) {
        next(new AppError("Authentication required", 401, { code: "NO_TOKEN" }));
        return;
    }

    try {
        req.user = await resolveUser(token);
        next();
    } catch (error) {
        next(error);
    }
}

export async function optionalGuard(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const token = extractAccessToken(req);
    if (!token) {
        next();
        return;
    }

    try {
        req.user = await resolveUser(token);
        next();
    } catch (error) {
        next(error);
    }
}

export const currentUser = (req: Request): AuthUser => {
    if (!req.user) {
        throw new AppError("Authentication required", 401, { code: "NO_TOKEN" });
    }
    return req.user;
};
