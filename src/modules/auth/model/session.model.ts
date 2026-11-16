import { model, Schema, type Types } from "mongoose";

export interface ISession {
    user: Types.ObjectId;
    refreshTokenHash: string;
    userAgent: string | null;
    ip: string | null;
    lastUsedAt: Date;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const sessionSchema = new Schema<ISession>(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        refreshTokenHash: { type: String, required: true },
        userAgent: { type: String, default: null, maxlength: 512 },
        ip: { type: String, default: null },
        lastUsedAt: { type: Date, default: Date.now },
        expiresAt: { type: Date, required: true, index: { expires: 0 } },
    },
    { timestamps: true }
);

export const Session = model<ISession>("Session", sessionSchema);
