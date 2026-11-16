import { model, Schema } from "mongoose";
import { Gender, numericEnumValues, Provider } from "../../auth/enum/enum.js";
import type { IUser, IUserSettings } from "../interface/user.interface.js";

const settingsSchema = new Schema<IUserSettings>(
    {
        isPrivate: { type: Boolean, default: false },
        emailNotifications: { type: Boolean, default: true },
    },
    { _id: false }
);

const userSchema = new Schema<IUser>(
    {
        userName: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            minlength: 3,
            maxlength: 30,
            match: /^[a-z0-9._]+$/,
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        password: {
            type: String,
            select: false,
            required: function (this: IUser): boolean {
                return this.provider === Provider.LOCAL;
            },
        },
        provider: {
            type: Number,
            enum: numericEnumValues(Provider),
            default: Provider.LOCAL,
        },
        googleId: {
            type: String,
            select: false,
        },
        phoneNumber: {
            type: String,
            trim: true,
        },
        gender: {
            type: Number,
            enum: numericEnumValues(Gender),
        },
        dob: {
            type: Date,
        },
        bio: {
            type: String,
            trim: true,
            maxlength: 160,
            default: "",
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
        settings: {
            type: settingsSchema,
            default: () => ({}),
        },
        followersCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        followingCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        passwordChangedAt: Date,
        lastLoginAt: Date,
    },
    {
        timestamps: true,
        toJSON: {
            transform(_doc, ret: Record<string, unknown>) {
                delete ret["password"];
                delete ret["googleId"];
                delete ret["__v"];
                return ret;
            },
        },
    }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ userName: 1 }, { unique: true });
userSchema.index({ isDeleted: 1, isVerified: 1, followersCount: -1 });

export const User = model<IUser>("User", userSchema);
