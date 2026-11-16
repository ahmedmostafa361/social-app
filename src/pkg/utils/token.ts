import jwt, { type JwtPayload } from "jsonwebtoken";
import crypto from "node:crypto";

export const generateToken = (
    payload: string | object | Buffer,
    secret: string,
    expiresInSeconds: number
): string => {
    return jwt.sign(payload, secret, {
        algorithm: "HS256",
        expiresIn: expiresInSeconds,
    });
};

export const verifyToken = <T extends JwtPayload = JwtPayload>(token: string, secret: string): T => {
    return jwt.verify(token, secret, { algorithms: ["HS256"] }) as T;
};

export const generateRandomToken = (bytes: number = 48): string => {
    return crypto.randomBytes(bytes).toString("base64url");
};