import { AppError } from "../../lib/errors/app.error.js";

export const userNotFound = () => new AppError("User not found", 404, { code: "USER_NOT_FOUND" });

export const userNameTaken = () => new AppError("This username is already taken", 409, { code: "USERNAME_TAKEN" });

export const invalidCurrentPassword = () =>
    new AppError("Current password is incorrect", 400, { code: "INVALID_CURRENT_PASSWORD" });

export const samePassword = () =>
    new AppError("New password must be different from the current one", 400, { code: "SAME_PASSWORD" });

export const passwordRequired = () =>
    new AppError("Please enter your current password", 400, { code: "PASSWORD_REQUIRED" });

export const cannotFollowSelf = () => new AppError("You can't follow yourself", 400, { code: "CANNOT_FOLLOW_SELF" });

export const alreadyFollowing = () =>
    new AppError("You already follow this user", 409, { code: "ALREADY_FOLLOWING" });

export const alreadyRequested = () =>
    new AppError("You already sent a follow request to this user", 409, { code: "ALREADY_REQUESTED" });

export const notFollowing = () =>
    new AppError("You don't follow this user", 404, { code: "NOT_FOLLOWING" });

export const notAFollower = () =>
    new AppError("This user doesn't follow you", 404, { code: "NOT_A_FOLLOWER" });

export const followRequestNotFound = () =>
    new AppError("Follow request not found", 404, { code: "FOLLOW_REQUEST_NOT_FOUND" });

export const privateAccount = () =>
    new AppError("This account is private. Follow it to see its followers and following", 403, {
        code: "PRIVATE_ACCOUNT",
    });
