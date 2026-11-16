import crypto from "node:crypto";

export const generateOTP = (): string => {
    return crypto.randomInt(100_000, 1_000_000).toString();
};
