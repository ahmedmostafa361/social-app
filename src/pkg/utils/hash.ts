import argon2 from "argon2";
import crypto from "node:crypto";

export const hashPassword = (password: string): Promise<string> => {
    return argon2.hash(password, { type: argon2.argon2id });
};

export const comparePassword = async (password: string, hash: string | null | undefined): Promise<boolean> => {
    if (!password || !hash) return false;
    try {
        return await argon2.verify(hash, password);
    } catch {
        return false;
    }
};

export const hmacHash = (value: string, secret: string): string => {
    return crypto.createHmac("sha256", secret).update(value).digest("hex");
};

export const sha256 = (value: string): string => {
    return crypto.createHash("sha256").update(value).digest("hex");
};

export const safeEqual = (a: string, b: string): boolean => {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    if (left.length !== right.length) return false;
    return crypto.timingSafeEqual(left, right);
};
