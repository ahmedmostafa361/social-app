import type { HydratedDocument, Types } from "mongoose";
import { AbstractRepository } from "../../../lib/db/abstract.repository.js";
import { Session, type ISession } from "../model/session.model.js";

type Id = Types.ObjectId | string;

export interface SessionView {
    _id: Types.ObjectId;
    userAgent: string | null;
    ip: string | null;
    lastUsedAt: Date;
    createdAt: Date;
    expiresAt: Date;
}

class SessionRepository extends AbstractRepository<ISession> {
    constructor() {
        super(Session);
    }

    async findActive(sessionId: Id): Promise<HydratedDocument<ISession> | null> {
        return this.model.findOne({ _id: sessionId, expiresAt: { $gt: new Date() } });
    }

    async isActive(sessionId: Id, userId: Id): Promise<boolean> {
        return Boolean(await this.model.exists({ _id: sessionId, user: userId, expiresAt: { $gt: new Date() } }));
    }

    async rotate(
        sessionId: Id,
        currentHash: string,
        data: Pick<ISession, "refreshTokenHash" | "expiresAt" | "ip" | "userAgent">
    ): Promise<HydratedDocument<ISession> | null> {
        return this.model.findOneAndUpdate(
            { _id: sessionId, refreshTokenHash: currentHash },
            { $set: { ...data, lastUsedAt: new Date() } },
            { returnDocument: "after" }
        );
    }

    async deleteUserSessions(userId: Id, exceptSessionId?: Id): Promise<number> {
        const filter: Record<string, unknown> = { user: userId };
        if (exceptSessionId) filter["_id"] = { $ne: exceptSessionId };
        const result = await this.model.deleteMany(filter);
        return result.deletedCount;
    }

    async listUserSessions(userId: Id): Promise<SessionView[]> {
        return this.model
            .find({ user: userId, expiresAt: { $gt: new Date() } })
            .select("userAgent ip lastUsedAt createdAt expiresAt")
            .sort({ lastUsedAt: -1 })
            .lean<SessionView[]>();
    }
}

export const sessionRepository = new SessionRepository();
