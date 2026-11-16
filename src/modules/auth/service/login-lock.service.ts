import { cacheProvider } from "../../../lib/cache/cache.js";
import { AUTH_LIMITS } from "../../../lib/config/constants.js";
import { sendEmailInBackground } from "../../../lib/email/email.js";
import { getAccountLockedEmail } from "../../../lib/email/templates/email.templates.js";
import { logger } from "../../../pkg/logger/logger.js";
import { toSeconds } from "../../../pkg/utils/time.js";

interface LockableUser {
    _id: unknown;
    email: string;
    userName: string;
    settings?: { emailNotifications?: boolean };
}

export type FailedLoginResult = { locked: true; retryAfterSeconds: number } | { locked: false; attemptsLeft: number };

const failuresKey = (userId: string) => `auth:login-failures:${userId}`;
const lockKey = (userId: string) => `auth:login-lock:${userId}`;

const warn = (action: string, error: unknown) =>
    logger.warn(`Login lock ${action} failed`, { error: error instanceof Error ? error.message : String(error) });

class LoginLockService {
    private readonly lockSeconds = toSeconds(AUTH_LIMITS.lockMinutes, "minutes");

    async getLockRemainingSeconds(userId: string): Promise<number> {
        try {
            const ttl = await cacheProvider.ttl(lockKey(userId));
            if (ttl === -1) {
                await cacheProvider.expire(lockKey(userId), this.lockSeconds);
                return this.lockSeconds;
            }
            return ttl > 0 ? ttl : 0;
        } catch (error) {
            warn("read", error);
            return 0;
        }
    }

    async registerFailure(user: LockableUser): Promise<FailedLoginResult> {
        const userId = String(user._id);
        try {
            const attempts = await cacheProvider.increment(failuresKey(userId));
            if (attempts === 1) {
                await cacheProvider.expire(
                    failuresKey(userId),
                    toSeconds(AUTH_LIMITS.failedLoginsWindowHours, "hours")
                );
            }

            if (attempts >= AUTH_LIMITS.maxFailedLogins) {
                await cacheProvider.set(lockKey(userId), "1", this.lockSeconds);
                await cacheProvider.del(failuresKey(userId));

                if (user.settings?.emailNotifications !== false) {
                    const { subject, html } = getAccountLockedEmail(user.userName, AUTH_LIMITS.lockMinutes);
                    sendEmailInBackground(user.email, subject, html);
                }

                return { locked: true, retryAfterSeconds: this.lockSeconds };
            }

            return { locked: false, attemptsLeft: AUTH_LIMITS.maxFailedLogins - attempts };
        } catch (error) {
            warn("write", error);
            return { locked: false, attemptsLeft: AUTH_LIMITS.maxFailedLogins };
        }
    }

    async clear(userId: string): Promise<void> {
        try {
            await cacheProvider.del(failuresKey(userId), lockKey(userId));
        } catch (error) {
            warn("clear", error);
        }
    }
}

export const loginLockService = new LoginLockService();
