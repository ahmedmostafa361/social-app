import { z } from "zod";
import {
    emailSchema,
    objectIdSchema,
    otpCodeSchema,
    passwordSchema,
    phoneNumberSchema,
    userNameSchema,
} from "../../../lib/validation/validation.js";
import { Gender } from "../enum/enum.js";

export const registerSchema = z
    .object({
        userName: userNameSchema,
        email: emailSchema,
        password: passwordSchema,
        confirmPassword: z.string(),
        phoneNumber: phoneNumberSchema.optional(),
        gender: z.enum(Gender).optional(),
    })
    .strict()
    .refine((data) => data.password === data.confirmPassword, {
        path: ["confirmPassword"],
        message: "Passwords do not match",
    })
    .transform(({ confirmPassword: _confirmPassword, ...rest }) => rest);

export const loginSchema = z
    .object({
        email: emailSchema,
        password: z.string().min(1, "Password is required").max(128),
    })
    .strict();

export const emailOnlySchema = z.object({ email: emailSchema }).strict();

export const verifyAccountSchema = z
    .object({
        email: emailSchema,
        code: otpCodeSchema,
    })
    .strict();

export const resetPasswordSchema = z
    .object({
        email: emailSchema,
        code: otpCodeSchema,
        newPassword: passwordSchema,
        confirmPassword: z.string(),
    })
    .strict()
    .refine((data) => data.newPassword === data.confirmPassword, {
        path: ["confirmPassword"],
        message: "Passwords do not match",
    });

export const googleLoginSchema = z
    .object({
        idToken: z.string().trim().min(1, "idToken is required"),
    })
    .strict();

export const refreshTokenSchema = z
    .object({
        refreshToken: z.string().trim().min(1).optional(),
    })
    .strict();

export const sessionParamsSchema = z.object({
    sessionId: objectIdSchema("session id"),
});

export type RegisterDto = z.output<typeof registerSchema>;
export type LoginDto = z.output<typeof loginSchema>;
export type VerifyAccountDto = z.output<typeof verifyAccountSchema>;
export type ResetPasswordDto = z.output<typeof resetPasswordSchema>;
