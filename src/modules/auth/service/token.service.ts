import { Types } from "mongoose";
import { env } from "../../../lib/config/env.js";
import type { RequestMeta } from "../../../lib/utils/request-meta.js";
import { logger } from "../../../pkg/logger/logger.js";
import { safeEqual, sha256 } from "../../../pkg/utils/hash.js";
import { addTime } from "../../../pkg/utils/time.js";
import { generateRandomToken, generateToken } from "../../../pkg/utils/token.js";
import { userRepository } from "../../user/repository/user.repository.js";
import { invalidRefreshToken } from "../errors.js";
import { sessionRepository } from "../repository/session.repository.js";

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    tokenType: "Bearer";
    accessTokenExpiresIn: number;
    refreshTokenExpiresAt: Date;
}

const SESSION_ID_PATTERN = /^[0-9a-f]{24}$/i;

class TokenService {
    private get accessTtlSeconds(): number {
        return env.tokens.accessExpiresMinutes * 60;
    }

    private buildTokens(
        userId: Types.ObjectId | string,
        sessionId: Types.ObjectId | string,
        secret: string,
        expiresAt: Date
    ): AuthTokens {
        return {
            accessToken: generateToken(
                { sub: String(userId), sid: String(sessionId), type: "access" },
                env.tokens.accessSecret,
                this.accessTtlSeconds
            ),
            refreshToken: `${String(sessionId)}.${secret}`,
            tokenType: "Bearer",
            accessTokenExpiresIn: this.accessTtlSeconds,
            refreshTokenExpiresAt: expiresAt,
        };
    }

    async createSession(userId: Types.ObjectId, meta: RequestMeta): Promise<AuthTokens> {
        const sessionId = new Types.ObjectId();
        const secret = generateRandomToken();
        const expiresAt = addTime(env.tokens.refreshExpiresDays, "days");

        await sessionRepository.create({
            _id: sessionId,
            user: userId,
            refreshTokenHash: sha256(secret),
            expiresAt,
            ip: meta.ip,
            userAgent: meta.userAgent,
            lastUsedAt: new Date(),
        });

        return this.buildTokens(userId, sessionId, secret, expiresAt);
    }

    async rotate(refreshToken: string | undefined, meta: RequestMeta): Promise<AuthTokens> {
        const [sessionId, secret] = String(refreshToken ?? "").split(".");
        if (!sessionId || !secret || !SESSION_ID_PATTERN.test(sessionId)) throw invalidRefreshToken();

        const session = await sessionRepository.findActive(sessionId);
        if (!session) throw invalidRefreshToken();

        const currentHash = sha256(secret);
        if (!safeEqual(currentHash, session.refreshTokenHash)) {
            await sessionRepository.deleteOne({ _id: session._id });
            logger.warn("Refresh token reuse detected, session revoked", {
                sessionId,
                userId: String(session.user),
            });
            throw invalidRefreshToken();
        }

        const user = await userRepository.findActiveById(session.user);
        if (!user) {
            await sessionRepository.deleteOne({ _id: session._id });
            throw invalidRefreshToken();
        }

        const newSecret = generateRandomToken();
        const expiresAt = addTime(env.tokens.refreshExpiresDays, "days");

        const rotated = await sessionRepository.rotate(sessionId, currentHash, {
            refreshTokenHash: sha256(newSecret),
            expiresAt,
            ip: meta.ip,
            userAgent: meta.userAgent,
        });
        if (!rotated) throw invalidRefreshToken();

        return this.buildTokens(user._id, sessionId, newSecret, expiresAt);
    }
}

export const tokenService = new TokenService();
