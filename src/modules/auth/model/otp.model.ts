import { model, Schema } from "mongoose";
import { OtpPurpose } from "../enum/enum.js";

export interface IOtp {
    email: string;
    purpose: OtpPurpose;
    codeHash: string;
    attempts: number;
    sentAt: Date;
    expiresAt: Date;
    createdAt: Date;
}

const otpSchema = new Schema<IOtp>(
    {
        email: { type: String, required: true, trim: true, lowercase: true },
        purpose: { type: String, required: true, enum: Object.values(OtpPurpose) },
        codeHash: { type: String, required: true },
        attempts: { type: Number, default: 0 },
        sentAt: { type: Date, required: true },
        expiresAt: { type: Date, required: true, index: { expires: 0 } },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

otpSchema.index({ email: 1, purpose: 1 }, { unique: true });

export const Otp = model<IOtp>("Otp", otpSchema);
