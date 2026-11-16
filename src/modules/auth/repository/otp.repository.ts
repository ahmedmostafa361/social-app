import type { HydratedDocument, Types } from "mongoose";
import { AbstractRepository } from "../../../lib/db/abstract.repository.js";
import type { OtpPurpose } from "../enum/enum.js";
import { Otp, type IOtp } from "../model/otp.model.js";

class OtpRepository extends AbstractRepository<IOtp> {
    constructor() {
        super(Otp);
    }

    async upsert(data: { email: string; purpose: OtpPurpose; codeHash: string; expiresAt: Date }): Promise<void> {
        await this.model.updateOne(
            { email: data.email, purpose: data.purpose },
            { $set: { codeHash: data.codeHash, expiresAt: data.expiresAt, attempts: 0, sentAt: new Date() } },
            { upsert: true }
        );
    }

    async consume(data: {
        email: string;
        purpose: OtpPurpose;
        codeHash: string;
        maxAttempts: number;
    }): Promise<HydratedDocument<IOtp> | null> {
        return this.model.findOneAndDelete({
            email: data.email,
            purpose: data.purpose,
            codeHash: data.codeHash,
            expiresAt: { $gt: new Date() },
            attempts: { $lt: data.maxAttempts },
        });
    }

    async find(email: string, purpose: OtpPurpose): Promise<HydratedDocument<IOtp> | null> {
        return this.model.findOne({ email, purpose });
    }

    async incrementAttempts(id: Types.ObjectId): Promise<HydratedDocument<IOtp> | null> {
        return this.model.findByIdAndUpdate(id, { $inc: { attempts: 1 } }, { returnDocument: "after" });
    }

    async remove(email: string, purpose: OtpPurpose): Promise<void> {
        await this.model.deleteOne({ email, purpose });
    }
}

export const otpRepository = new OtpRepository();
