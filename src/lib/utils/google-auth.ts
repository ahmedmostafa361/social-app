import { OAuth2Client, type TokenPayload } from "google-auth-library";
import { AppError } from "../errors/app.error.js";
import { env } from "../config/env.js";

const client = env.google.clientId ? new OAuth2Client(env.google.clientId) : null;

export const verifyGoogleToken = async (idToken: string): Promise<TokenPayload> => {
    if (!client || !env.google.clientId) {
        throw new AppError("Google sign-in is not configured", 503, { code: "GOOGLE_NOT_CONFIGURED" });
    }

    try {
        const ticket = await client.verifyIdToken({ idToken, audience: env.google.clientId });
        const payload = ticket.getPayload();
        if (!payload) throw new Error("Empty Google payload");
        return payload;
    } catch {
        throw new AppError("Invalid or expired Google token", 401, { code: "INVALID_GOOGLE_TOKEN" });
    }
};
