import crypto from "node:crypto";

export const toUserNameBase = (value = ""): string => {
    const base = String(value)
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z0-9._]/g, "")
        .replace(/^[._]+|[._]+$/g, "")
        .slice(0, 20);
    return base.length >= 3 ? base : `user${base}`;
};

export const randomUserNameFrom = (value: string): string => {
    return `${toUserNameBase(value)}${crypto.randomInt(1000, 10000)}`;
};
