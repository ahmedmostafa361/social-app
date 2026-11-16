import jwt, { type JwtPayload } from "jsonwebtoken";
import crypto from "node:crypto";

export const generateToken = (payload: object, secret: string, expiresInSeconds: number): string => {
    return jwt.sign(payload, secret, {
        algorithm: "HS256",
        expiresIn: expiresInSeconds,
    });
};

export const verifyToken = <T extends JwtPayload = JwtPayload>(token: string, secret: string): T => {
    const payload = jwt.verify(token, secret, { algorithms: ["HS256"] });
    if (typeof payload === "string") {
        throw new jwt.JsonWebTokenError("Unexpected token payload");
    }
    return payload as T;
};

export const generateRandomToken = (bytes = 48): string => {
    return crypto.randomBytes(bytes).toString("base64url");
};
