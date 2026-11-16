import type { HydratedDocument } from "mongoose";
import { AUTH_LIMITS } from "../../../lib/config/constants.js";
import { sendEmailInBackground } from "../../../lib/email/email.js";
import { getPasswordChangedEmail } from "../../../lib/email/templates/email.templates.js";
import { verifyGoogleToken } from "../../../lib/utils/google-auth.js";
import type { RequestMeta } from "../../../lib/utils/request-meta.js";
import { comparePassword, hashPassword } from "../../../pkg/utils/hash.js";
import { maskEmail } from "../../../pkg/utils/string.js";
import type { IUser, UserJSON } from "../../user/interface/user.interface.js";
import { userRepository } from "../../user/repository/user.repository.js";
import { userService } from "../../user/service/user.service.js";
import { userNameTaken } from "../../user/errors.js";
import type { LoginDto, RegisterDto, ResetPasswordDto, VerifyAccountDto } from "../dto/dto.js";
import { OtpPurpose, Provider } from "../enum/enum.js";
import {
    accountDisabled,
    accountLocked,
    googleAccountNoPassword,
    googleEmailNotVerified,
    invalidCredentials,
    otpExpired,
    sessionNotFound,
    userAlreadyExists,
    userAlreadyVerified,
    userNotVerified,
} from "../errors.js";
import { sessionRepository, type SessionView } from "../repository/session.repository.js";
import { loginLockService } from "./login-lock.service.js";
import { otpService } from "./otp.service.js";
import { tokenService, type AuthTokens } from "./token.service.js";

export interface LoginResult {
    user: UserJSON;
    tokens: AuthTokens;
}

class AuthService {
    private dummyHash: Promise<string> | null = null;

    private async burnPasswordCheck(password: string): Promise<void> {
        this.dummyHash ??= hashPassword("timing-safe-placeholder-Password1");
        await comparePassword(password, await this.dummyHash);
    }

    private async issueLogin(user: HydratedDocument<IUser>, meta: RequestMeta): Promise<LoginResult> {
        const updated = await userRepository.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
        const tokens = await tokenService.createSession(user._id, meta);
        return { user: (updated ?? user).toJSON(), tokens };
    }

    async register(data: RegisterDto): Promise<{ user: UserJSON; emailSent: boolean }> {
        if (await userRepository.findByEmail(data.email)) throw userAlreadyExists();
        if (await userRepository.userNameExists(data.userName)) throw userNameTaken();

        const user = await userRepository.create({
            ...data,
            password: await hashPassword(data.password),
            provider: Provider.LOCAL,
        });

        let emailSent = true;
        try {
            await otpService.send(user.email, OtpPurpose.VERIFY_EMAIL);
        } catch {
            emailSent = false;
        }

        return { user: user.toJSON(), emailSent };
    }

    async verifyAccount({ email, code }: VerifyAccountDto): Promise<UserJSON> {
        const user = await userRepository.findByEmail(email);
        if (!user || user.isDeleted) throw otpExpired();
        if (user.isVerified) throw userAlreadyVerified();

        await otpService.verify(email, OtpPurpose.VERIFY_EMAIL, code);

        const updated = await userRepository.updateOne({ _id: user._id }, { $set: { isVerified: true } });
        return (updated ?? user).toJSON();
    }

    async resendVerification(email: string): Promise<void> {
        const user = await userRepository.findByEmail(email);
        if (!user || user.isDeleted || user.isVerified) return;
        await otpService.send(email, OtpPurpose.VERIFY_EMAIL);
    }

    async forgotPassword(email: string): Promise<void> {
        const user = await userRepository.findByEmail(email);
        if (!user || user.isDeleted) return;
        await otpService.send(email, OtpPurpose.RESET_PASSWORD);
    }

    async resetPassword({ email, code, newPassword }: ResetPasswordDto): Promise<void> {
        await otpService.verify(email, OtpPurpose.RESET_PASSWORD, code);

        const user = await userRepository.findByEmail(email);
        if (!user || user.isDeleted) throw otpExpired();

        await userRepository.updateOne(
            { _id: user._id },
            {
                $set: {
                    password: await hashPassword(newPassword),
                    passwordChangedAt: new Date(),
                    isVerified: true,
                },
            }
        );

        await Promise.all([
            sessionRepository.deleteUserSessions(user._id),
            loginLockService.clear(String(user._id)),
        ]);

        if (user.settings.emailNotifications) {
            const { subject, html } = getPasswordChangedEmail(user.userName);
            sendEmailInBackground(user.email, subject, html);
        }
    }

    async login({ email, password }: LoginDto, meta: RequestMeta): Promise<LoginResult> {
        const user = await userRepository.findByEmail(email, true);
        if (!user) {
            await this.burnPasswordCheck(password);
            throw invalidCredentials();
        }

        const userId = String(user._id);
        const lockRemaining = await loginLockService.getLockRemainingSeconds(userId);
        if (lockRemaining > 0) throw accountLocked(lockRemaining);

        if (!user.password) throw googleAccountNoPassword();

        if (!(await comparePassword(password, user.password))) {
            const result = await loginLockService.registerFailure(user);
            if (result.locked) throw accountLocked(result.retryAfterSeconds);
            throw invalidCredentials(result.attemptsLeft);
        }

        await loginLockService.clear(userId);

        if (user.isDeleted) throw accountDisabled();
        if (!user.isVerified) throw userNotVerified();

        return this.issueLogin(user, meta);
    }

    async loginWithGoogle(idToken: string, meta: RequestMeta): Promise<LoginResult & { isNewUser: boolean }> {
        const payload = await verifyGoogleToken(idToken);
        if (!payload.email || payload.email_verified !== true) throw googleEmailNotVerified();

        const email = payload.email.toLowerCase();
        const existing = await userRepository.findByEmail(email);

        if (existing?.isDeleted) throw accountDisabled();

        if (existing) {
            const linked =
                (await userRepository.updateOne(
                    { _id: existing._id },
                    { $set: { isVerified: true, googleId: payload.sub } }
                )) ?? existing;
            return { ...(await this.issueLogin(linked, meta)), isNewUser: false };
        }

        const fallback = email.split("@")[0] ?? "user";
        const created = await userRepository.create({
            email,
            userName: await userService.generateUniqueUserName(payload.given_name ?? fallback),
            provider: Provider.GOOGLE,
            googleId: payload.sub,
            isVerified: true,
        });

        return { ...(await this.issueLogin(created, meta)), isNewUser: true };
    }

    async refresh(refreshToken: string | undefined, meta: RequestMeta): Promise<AuthTokens> {
        return tokenService.rotate(refreshToken, meta);
    }

    async logout(sessionId: string): Promise<void> {
        await sessionRepository.deleteOne({ _id: sessionId });
    }

    async logoutAll(userId: string): Promise<{ revokedSessions: number }> {
        return { revokedSessions: await sessionRepository.deleteUserSessions(userId) };
    }

    async listSessions(userId: string, currentSessionId: string): Promise<(SessionView & { isCurrent: boolean })[]> {
        const sessions = await sessionRepository.listUserSessions(userId);
        return sessions.map((session) => ({ ...session, isCurrent: String(session._id) === currentSessionId }));
    }

    async revokeSession(userId: string, sessionId: string): Promise<void> {
        const deleted = await sessionRepository.deleteOne({ _id: sessionId, user: userId });
        if (!deleted) throw sessionNotFound();
    }

    otpInfo(email: string) {
        return { email: maskEmail(email), codeExpiresInMinutes: AUTH_LIMITS.otpExpiresMinutes };
    }
}

export const authService = new AuthService();
