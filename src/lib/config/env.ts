import "dotenv/config";
import { z } from "zod";

const booleanFromString = z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true");

const optionalString = z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined));

const envSchema = z
    .object({
        NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
        PORT: z.coerce.number().int().positive().default(3000),
        APP_NAME: z.string().trim().min(1).default("Social App"),
        CORS_ORIGINS: z.string().default("http://localhost:4200"),
        TRUST_PROXY: booleanFromString,

        DB_URL: z.string().trim().min(1, "DB_URL is required"),

        ACCESS_TOKEN_SECRET: z.string().min(32, "ACCESS_TOKEN_SECRET must be at least 32 characters"),
        ACCESS_TOKEN_EXPIRES_MINUTES: z.coerce.number().int().positive().default(15),
        REFRESH_TOKEN_EXPIRES_DAYS: z.coerce.number().int().positive().default(7),
        OTP_SECRET: z.string().min(32, "OTP_SECRET must be at least 32 characters"),

        REDIS_HOST: z.string().trim().default("127.0.0.1"),
        REDIS_PORT: z.coerce.number().int().positive().default(6379),
        REDIS_PASSWORD: optionalString,
        UPSTASH_REDIS_REST_URL: optionalString,
        UPSTASH_REDIS_REST_TOKEN: optionalString,

        EMAIL_PROVIDER: z.enum(["nodemailer", "mailjet"]).default("nodemailer"),
        MAIL_HOST: z.string().trim().default("smtp.gmail.com"),
        MAIL_PORT: z.coerce.number().int().positive().default(587),
        MAIL_SECURE: booleanFromString,
        MAIL_USER: optionalString,
        MAIL_PASS: optionalString,
        MAIL_FROM_NAME: z.string().trim().default("Social App"),

        MAILJET_API_KEY: optionalString,
        MAILJET_SECRET_KEY: optionalString,
        MAILJET_FROM_EMAIL: optionalString,

        GOOGLE_CLIENT_ID: optionalString,
    })
    .superRefine((data, ctx) => {
        if (data.EMAIL_PROVIDER === "nodemailer" && (!data.MAIL_USER || !data.MAIL_PASS)) {
            ctx.addIssue({
                code: "custom",
                path: ["MAIL_USER"],
                message: "MAIL_USER and MAIL_PASS are required when EMAIL_PROVIDER=nodemailer",
            });
        }
        if (
            data.EMAIL_PROVIDER === "mailjet" &&
            (!data.MAILJET_API_KEY || !data.MAILJET_SECRET_KEY || !data.MAILJET_FROM_EMAIL)
        ) {
            ctx.addIssue({
                code: "custom",
                path: ["MAILJET_API_KEY"],
                message: "MAILJET_API_KEY, MAILJET_SECRET_KEY and MAILJET_FROM_EMAIL are required when EMAIL_PROVIDER=mailjet",
            });
        }
    });

const result = envSchema.safeParse(process.env);

if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    console.error(JSON.stringify({ level: "error", message: "Invalid environment variables", issues }));
    process.exit(1);
}

const parsed = result.data;

export const env = {
    nodeEnv: parsed.NODE_ENV,
    isProduction: parsed.NODE_ENV === "production",
    port: parsed.PORT,
    appName: parsed.APP_NAME,
    corsOrigins: parsed.CORS_ORIGINS.split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    trustProxy: parsed.TRUST_PROXY,

    db: {
        url: parsed.DB_URL,
    },

    tokens: {
        accessSecret: parsed.ACCESS_TOKEN_SECRET,
        accessExpiresMinutes: parsed.ACCESS_TOKEN_EXPIRES_MINUTES,
        refreshExpiresDays: parsed.REFRESH_TOKEN_EXPIRES_DAYS,
        otpSecret: parsed.OTP_SECRET,
    },

    redis: {
        host: parsed.REDIS_HOST,
        port: parsed.REDIS_PORT,
        password: parsed.REDIS_PASSWORD,
        upstashUrl: parsed.UPSTASH_REDIS_REST_URL,
        upstashToken: parsed.UPSTASH_REDIS_REST_TOKEN,
    },

    mail: {
        provider: parsed.EMAIL_PROVIDER,
        host: parsed.MAIL_HOST,
        port: parsed.MAIL_PORT,
        secure: parsed.MAIL_SECURE,
        user: parsed.MAIL_USER,
        pass: parsed.MAIL_PASS,
        fromName: parsed.MAIL_FROM_NAME,
        mailjetApiKey: parsed.MAILJET_API_KEY,
        mailjetSecretKey: parsed.MAILJET_SECRET_KEY,
        mailjetFromEmail: parsed.MAILJET_FROM_EMAIL,
    },

    google: {
        clientId: parsed.GOOGLE_CLIENT_ID,
    },
} as const;
