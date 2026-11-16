import type { CookieOptions, Response } from "express";
import { env } from "../config/env.js";
import { ACCESS_COOKIE, REFRESH_COOKIE, REFRESH_COOKIE_PATH } from "../config/constants.js";
import { toMs } from "../../pkg/utils/time.js";

const baseCookieOptions = (): CookieOptions => ({
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction ? "none" : "lax",
});

export const setAuthCookies = (
    res: Response,
    { accessToken, refreshToken }: { accessToken: string; refreshToken: string }
): void => {
    res.cookie(ACCESS_COOKIE, accessToken, {
        ...baseCookieOptions(),
        maxAge: toMs(env.tokens.accessExpiresMinutes, "minutes"),
    });
    res.cookie(REFRESH_COOKIE, refreshToken, {
        ...baseCookieOptions(),
        path: REFRESH_COOKIE_PATH,
        maxAge: toMs(env.tokens.refreshExpiresDays, "days"),
    });
};

export const clearAuthCookies = (res: Response): void => {
    res.clearCookie(ACCESS_COOKIE, baseCookieOptions());
    res.clearCookie(REFRESH_COOKIE, { ...baseCookieOptions(), path: REFRESH_COOKIE_PATH });
};
