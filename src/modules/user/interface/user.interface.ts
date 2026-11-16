import type { Types } from "mongoose";
import type { Gender, Provider } from "../../auth/enum/enum.js";
import type { FollowStatus } from "../enum/enum.js";

export interface IUserSettings {
    isPrivate: boolean;
    emailNotifications: boolean;
}

export interface IUser {
    userName: string;
    email: string;
    password?: string;
    provider: Provider;
    googleId?: string;
    phoneNumber?: string;
    gender?: Gender;
    dob?: Date;
    bio: string;
    isVerified: boolean;
    isDeleted: boolean;
    settings: IUserSettings;
    followersCount: number;
    followingCount: number;
    passwordChangedAt?: Date;
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface IFollow {
    follower: Types.ObjectId;
    following: Types.ObjectId;
    status: FollowStatus;
    acceptedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface PublicUser {
    _id: Types.ObjectId;
    userName: string;
    bio: string;
    isPrivate: boolean;
    followersCount: number;
    followingCount: number;
}

export type UserJSON = Omit<IUser, "password" | "googleId"> & { _id: Types.ObjectId };
