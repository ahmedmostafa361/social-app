export enum Provider {
    LOCAL = 0,
    GOOGLE = 1,
    FACEBOOK = 2,
}

export enum Gender {
    MALE = 0,
    FEMALE = 1,
}

export enum OtpPurpose {
    VERIFY_EMAIL = "verify-email",
    RESET_PASSWORD = "reset-password",
}

export const numericEnumValues = (target: Record<string, string | number>): number[] =>
    Object.values(target).filter((value): value is number => typeof value === "number");
