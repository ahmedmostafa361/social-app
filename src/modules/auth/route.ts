import { Router } from "express";
import { authGuard } from "../../lib/middleware/auth.guard.js";
import { byIpAndEmail, rateLimit } from "../../lib/middleware/rate-limit.js";
import { authController } from "./controller/auth.controller.js";

export const authRouter: Router = Router();

const registerLimit = rateLimit({ name: "register", windowSeconds: 3600, max: 10 });
const loginLimit = rateLimit({ name: "login", windowSeconds: 900, max: 30 });
const otpLimit = rateLimit({ name: "otp", windowSeconds: 900, max: 5, identity: byIpAndEmail });
const codeLimit = rateLimit({ name: "verify-code", windowSeconds: 900, max: 20 });
const refreshLimit = rateLimit({ name: "refresh", windowSeconds: 900, max: 60 });

authRouter.post("/register", registerLimit, authController.register);
authRouter.post("/verify-account", codeLimit, authController.verifyAccount);
authRouter.post("/resend-verification", otpLimit, authController.resendVerification);

authRouter.post("/login", loginLimit, authController.login);
authRouter.post("/google", loginLimit, authController.loginWithGoogle);

authRouter.post("/refresh-token", refreshLimit, authController.refreshToken);
authRouter.post("/logout", authGuard, authController.logout);
authRouter.post("/logout-all", authGuard, authController.logoutAll);
authRouter.get("/sessions", authGuard, authController.listSessions);
authRouter.delete("/sessions/:sessionId", authGuard, authController.revokeSession);

authRouter.post("/forgot-password", otpLimit, authController.forgotPassword);
authRouter.post("/reset-password", codeLimit, authController.resetPassword);
