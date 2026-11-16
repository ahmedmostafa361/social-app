export const AUTH_LIMITS = Object.freeze({
    maxFailedLogins: 5,
    lockMinutes: 15,
    failedLoginsWindowHours: 24,
    otpExpiresMinutes: 10,
    otpMaxAttempts: 5,
    otpResendCooldownSeconds: 60,
});

export const REFRESH_COOKIE_PATH = "/api/auth";

export const ACCESS_COOKIE = "access_token";

export const REFRESH_COOKIE = "refresh_token";

export const SUGGESTIONS_LIMIT = Object.freeze({
    default: 10,
    max: 30,
});
