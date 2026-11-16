import type { HydratedDocument, Types } from "mongoose";
import { AbstractRepository } from "../../../lib/db/abstract.repository.js";
import { skipFor } from "../../../lib/utils/pagination.js";
import type { IUser, PublicUser } from "../interface/user.interface.js";
import { User } from "../model/user.model.js";

export const PUBLIC_USER_FIELDS = "userName bio settings.isPrivate followersCount followingCount";

type UserId = Types.ObjectId | string;

interface PublicUserRow {
    _id: Types.ObjectId;
    userName: string;
    bio?: string;
    settings?: { isPrivate?: boolean };
    followersCount?: number;
    followingCount?: number;
}

export const toPublicUser = (user: PublicUserRow): PublicUser => ({
    _id: user._id,
    userName: user.userName,
    bio: user.bio ?? "",
    isPrivate: user.settings?.isPrivate === true,
    followersCount: user.followersCount ?? 0,
    followingCount: user.followingCount ?? 0,
});

class UserRepository extends AbstractRepository<IUser> {
    constructor() {
        super(User);
    }

    async findByEmail(email: string, withPassword = false): Promise<HydratedDocument<IUser> | null> {
        const query = this.model.findOne({ email });
        return withPassword ? query.select("+password") : query;
    }

    async findActiveById(id: UserId, withPassword = false): Promise<HydratedDocument<IUser> | null> {
        const query = this.model.findOne({ _id: id, isDeleted: false });
        return withPassword ? query.select("+password") : query;
    }

    async findActiveByUserName(userName: string): Promise<HydratedDocument<IUser> | null> {
        return this.model.findOne({ userName: userName.toLowerCase(), isDeleted: false, isVerified: true });
    }

    async userNameExists(userName: string, excludeUserId?: UserId): Promise<boolean> {
        const filter: Record<string, unknown> = { userName: userName.toLowerCase() };
        if (excludeUserId) filter["_id"] = { $ne: excludeUserId };
        return Boolean(await this.model.exists(filter));
    }

    async incrementCounters(
        id: UserId,
        counters: { followersCount?: number; followingCount?: number }
    ): Promise<void> {
        await this.model.updateOne({ _id: id }, { $inc: counters });
    }

    async incrementFollowingForMany(ids: Types.ObjectId[], delta: number): Promise<void> {
        if (ids.length === 0) return;
        await this.model.updateMany({ _id: { $in: ids } }, { $inc: { followingCount: delta } });
    }

    async search(params: {
        regex: string;
        excludeIds: UserId[];
        page: number;
        limit: number;
    }): Promise<{ users: PublicUser[]; total: number }> {
        const filter = {
            isDeleted: false,
            isVerified: true,
            _id: { $nin: params.excludeIds },
            userName: { $regex: params.regex, $options: "i" },
        };

        const [users, total] = await Promise.all([
            this.model
                .find(filter)
                .select(PUBLIC_USER_FIELDS)
                .sort({ followersCount: -1, userName: 1 })
                .skip(skipFor(params.page, params.limit))
                .limit(params.limit)
                .lean<PublicUserRow[]>(),
            this.model.countDocuments(filter),
        ]);

        return { users: users.map(toPublicUser), total };
    }

    async findPopular(excludeIds: UserId[], limit: number): Promise<PublicUser[]> {
        const users = await this.model
            .find({ isDeleted: false, isVerified: true, _id: { $nin: excludeIds } })
            .select(PUBLIC_USER_FIELDS)
            .sort({ followersCount: -1, createdAt: -1 })
            .limit(limit)
            .lean<PublicUserRow[]>();
        return users.map(toPublicUser);
    }

    async findPublicByIds(ids: Types.ObjectId[]): Promise<PublicUser[]> {
        const users = await this.model
            .find({ _id: { $in: ids }, isDeleted: false, isVerified: true })
            .select(PUBLIC_USER_FIELDS)
            .lean<PublicUserRow[]>();
        return users.map(toPublicUser);
    }
}

export const userRepository = new UserRepository();
