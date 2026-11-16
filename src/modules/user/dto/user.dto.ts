import { z } from "zod";
import {
    objectIdSchema,
    paginationSchema,
    passwordSchema,
    phoneNumberSchema,
    userNameSchema,
} from "../../../lib/validation/validation.js";
import { SUGGESTIONS_LIMIT } from "../../../lib/config/constants.js";
import { Gender } from "../../auth/enum/enum.js";

const atLeastOneField = (data: Record<string, unknown>) => Object.keys(data).length > 0;

export const updateProfileSchema = z
    .object({
        userName: userNameSchema.optional(),
        bio: z.string().trim().max(160).optional(),
        phoneNumber: phoneNumberSchema.nullable().optional(),
        gender: z.enum(Gender).nullable().optional(),
        dob: z.coerce
            .date()
            .max(new Date(), "Date of birth can't be in the future")
            .nullable()
            .optional(),
    })
    .strict()
    .refine(atLeastOneField, "Send at least one field to update");

export const updateSettingsSchema = z
    .object({
        isPrivate: z.boolean().optional(),
        emailNotifications: z.boolean().optional(),
    })
    .strict()
    .refine(atLeastOneField, "Send at least one setting to update");

export const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1).max(128).optional(),
        newPassword: passwordSchema,
        confirmPassword: z.string(),
    })
    .strict()
    .refine((data) => data.newPassword === data.confirmPassword, {
        path: ["confirmPassword"],
        message: "Passwords do not match",
    });

export const userIdParamsSchema = z.object({
    userId: objectIdSchema("user id"),
});

export const userNameParamsSchema = z.object({
    userName: userNameSchema,
});

export const searchUsersSchema = paginationSchema.extend({
    q: z.string().trim().min(1, "Search text is required").max(30),
});

export const suggestionsSchema = z.object({
    limit: z.coerce.number().int().min(1).max(SUGGESTIONS_LIMIT.max).default(SUGGESTIONS_LIMIT.default),
});

export { paginationSchema };

export type UpdateProfileDto = z.output<typeof updateProfileSchema>;
export type UpdateSettingsDto = z.output<typeof updateSettingsSchema>;
export type ChangePasswordDto = z.output<typeof changePasswordSchema>;
