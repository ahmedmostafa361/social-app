import { AppError } from "../../lib/errors/app.error.js";

export const invalidCredentials = (attemptsLeft?: number) =>
    new AppError("Invalid email or password", 401, {
        code: "INVALID_CREDENTIALS",
        ...(attemptsLeft !== undefined ? { details: { attemptsLeft } } : {}),
    });

export const accountLocked = (retryAfterSeconds: number) =>
    new AppError(
        `Too many failed login attempts. Try again in ${Math.ceil(retryAfterSeconds / 60)} minute(s)`,
        429,
        { code: "ACCOUNT_LOCKED", details: { retryAfterSeconds } }
    );

export const invalidCode = (attemptsLeft: number) =>
    new AppError("Invalid code", 400, { code: "INVALID_OTP", details: { attemptsLeft } });

export const otpExpired = () =>
    new AppError("Code expired or not found. Please request a new one", 400, { code: "OTP_EXPIRED" });

export const tooManyOtpAttempts = () =>
    new AppError("Too many wrong codes. Please request a new one", 429, { code: "OTP_ATTEMPTS_EXCEEDED" });

export const otpResendCooldown = (retryAfterSeconds: number) =>
    new AppError(`Please wait ${retryAfterSeconds} seconds before requesting a new code`, 429, {
        code: "OTP_COOLDOWN",
        details: { retryAfterSeconds },
    });

export const invalidRefreshToken = () =>
    new AppError("Invalid or expired refresh token. Please log in again", 401, { code: "INVALID_REFRESH_TOKEN" });

export const googleAccountNoPassword = () =>
    new AppError("This account uses Google sign-in. Log in with Google or reset your password", 400, {
        code: "GOOGLE_ACCOUNT",
    });

export const googleEmailNotVerified = () =>
    new AppError("Your Google email is not verified", 401, { code: "GOOGLE_EMAIL_NOT_VERIFIED" });

export const sessionNotFound = () => new AppError("Session not found", 404, { code: "SESSION_NOT_FOUND" });

export const userAlreadyExists = () =>
    new AppError("An account with this email already exists", 409, { code: "USER_EXISTS" });

export const userAlreadyVerified = () =>
    new AppError("This account is already verified", 400, { code: "ALREADY_VERIFIED" });

export const userNotVerified = () =>
    new AppError("Please verify your email before logging in", 403, { code: "EMAIL_NOT_VERIFIED" });

export const accountDisabled = () =>
    new AppError("This account has been deleted", 403, { code: "ACCOUNT_DELETED" });
