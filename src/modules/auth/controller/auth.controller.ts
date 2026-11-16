import type { Request, Response } from "express";
import { clearAuthCookies, setAuthCookies } from "../../../lib/auth/cookies.js";
import { REFRESH_COOKIE } from "../../../lib/config/constants.js";
import { currentUser } from "../../../lib/middleware/auth.guard.js";
import { requestMeta } from "../../../lib/utils/request-meta.js";
import { validate } from "../../../lib/validation/validation.js";
import {
    emailOnlySchema,
    googleLoginSchema,
    loginSchema,
    refreshTokenSchema,
    registerSchema,
    resetPasswordSchema,
    sessionParamsSchema,
    verifyAccountSchema,
} from "../dto/dto.js";
import { authService, type LoginResult } from "../service/auth.service.js";

const readRefreshCookie = (req: Request): string | undefined => {
    const cookies: Record<string, unknown> | undefined = req.cookies;
    const value = cookies?.[REFRESH_COOKIE];
    return typeof value === "string" && value ? value : undefined;
};

class AuthController {
    private sendLogin(res: Response, result: LoginResult, extra: Record<string, unknown> = {}): void {
        setAuthCookies(res, result.tokens);
        res.status(200).json({
            message: "Logged in successfully",
            success: true,
            data: { user: result.user, ...result.tokens, ...extra },
        });
    }

    register = async (req: Request, res: Response): Promise<void> => {
        const data = validate(registerSchema, req.body);
        const { user, emailSent } = await authService.register(data);
        res.status(201).json({
            message: emailSent
                ? "Account created. Check your email for the verification code"
                : "Account created, but we couldn't send the verification email. Request a new code from /api/auth/resend-verification",
            success: true,
            data: { user, verification: emailSent ? authService.otpInfo(data.email) : null },
        });
    };

    verifyAccount = async (req: Request, res: Response): Promise<void> => {
        const data = validate(verifyAccountSchema, req.body);
        const user = await authService.verifyAccount(data);
        res.status(200).json({ message: "Email verified successfully. You can log in now", success: true, data: user });
    };

    resendVerification = async (req: Request, res: Response): Promise<void> => {
        const { email } = validate(emailOnlySchema, req.body);
        await authService.resendVerification(email);
        res.status(200).json({
            message: "If an unverified account matches this email, we sent it a new code",
            success: true,
        });
    };

    login = async (req: Request, res: Response): Promise<void> => {
        const data = validate(loginSchema, req.body);
        const result = await authService.login(data, requestMeta(req));
        this.sendLogin(res, result);
    };

    loginWithGoogle = async (req: Request, res: Response): Promise<void> => {
        const { idToken } = validate(googleLoginSchema, req.body);
        const { isNewUser, ...result } = await authService.loginWithGoogle(idToken, requestMeta(req));
        this.sendLogin(res, result, { isNewUser });
    };

    refreshToken = async (req: Request, res: Response): Promise<void> => {
        const body = validate(refreshTokenSchema, req.body);
        const tokens = await authService.refresh(body.refreshToken ?? readRefreshCookie(req), requestMeta(req));
        setAuthCookies(res, tokens);
        res.status(200).json({ message: "Tokens refreshed", success: true, data: tokens });
    };

    forgotPassword = async (req: Request, res: Response): Promise<void> => {
        const { email } = validate(emailOnlySchema, req.body);
        await authService.forgotPassword(email);
        res.status(200).json({
            message: "If an account matches this email, we sent it a password reset code",
            success: true,
        });
    };

    resetPassword = async (req: Request, res: Response): Promise<void> => {
        const data = validate(resetPasswordSchema, req.body);
        await authService.resetPassword(data);
        clearAuthCookies(res);
        res.status(200).json({
            message: "Password reset successfully. Please log in with your new password",
            success: true,
        });
    };

    logout = async (req: Request, res: Response): Promise<void> => {
        await authService.logout(currentUser(req).sessionId);
        clearAuthCookies(res);
        res.status(200).json({ message: "Logged out", success: true });
    };

    logoutAll = async (req: Request, res: Response): Promise<void> => {
        const data = await authService.logoutAll(currentUser(req).userId);
        clearAuthCookies(res);
        res.status(200).json({ message: "Logged out from all devices", success: true, data });
    };

    listSessions = async (req: Request, res: Response): Promise<void> => {
        const { userId, sessionId } = currentUser(req);
        const sessions = await authService.listSessions(userId, sessionId);
        res.status(200).json({ message: "Active sessions", success: true, data: sessions });
    };

    revokeSession = async (req: Request, res: Response): Promise<void> => {
        const user = currentUser(req);
        const { sessionId } = validate(sessionParamsSchema, req.params);
        await authService.revokeSession(user.userId, sessionId);
        if (sessionId === user.sessionId) clearAuthCookies(res);
        res.status(200).json({ message: "Session revoked", success: true });
    };
}

export const authController = new AuthController();
