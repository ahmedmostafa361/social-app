import { Types, type HydratedDocument } from "mongoose";
import { AbstractRepository } from "../../../lib/db/abstract.repository.js";
import { skipFor } from "../../../lib/utils/pagination.js";
import { FollowStatus } from "../enum/enum.js";
import type { IFollow, PublicUser } from "../interface/user.interface.js";
import { Follow } from "../model/follow.model.js";
import { PUBLIC_USER_FIELDS, toPublicUser } from "./user.repository.js";

type UserId = Types.ObjectId | string;

export interface FollowListItem {
    user: PublicUser;
    since: Date;
}

interface PopulatedFollow {
    _id: Types.ObjectId;
    createdAt: Date;
    acceptedAt?: Date;
    follower?: Parameters<typeof toPublicUser>[0] | null;
    following?: Parameters<typeof toPublicUser>[0] | null;
}

const toObjectId = (id: UserId): Types.ObjectId => (typeof id === "string" ? new Types.ObjectId(id) : id);

class FollowRepository extends AbstractRepository<IFollow> {
    constructor() {
        super(Follow);
    }

    async findRelation(follower: UserId, following: UserId): Promise<HydratedDocument<IFollow> | null> {
        return this.model.findOne({ follower, following });
    }

    async isAcceptedFollower(follower: UserId, following: UserId): Promise<boolean> {
        return Boolean(await this.model.exists({ follower, following, status: FollowStatus.ACCEPTED }));
    }

    private async listBy(
        side: "follower" | "following",
        userId: UserId,
        status: FollowStatus,
        page: number,
        limit: number
    ): Promise<{ items: FollowListItem[]; total: number }> {
        const ownerField = side === "follower" ? "following" : "follower";
        const filter = { [ownerField]: userId, status };

        const [rows, total] = await Promise.all([
            this.model
                .find(filter)
                .sort({ createdAt: -1 })
                .skip(skipFor(page, limit))
                .limit(limit)
                .populate({ path: side, select: PUBLIC_USER_FIELDS, match: { isDeleted: false } })
                .lean<PopulatedFollow[]>(),
            this.model.countDocuments(filter),
        ]);

        const items = rows.flatMap((row) => {
            const user = row[side];
            return user ? [{ user: toPublicUser(user), since: row.acceptedAt ?? row.createdAt }] : [];
        });

        return { items, total };
    }

    async listFollowers(userId: UserId, page: number, limit: number) {
        return this.listBy("follower", userId, FollowStatus.ACCEPTED, page, limit);
    }

    async listFollowing(userId: UserId, page: number, limit: number) {
        return this.listBy("following", userId, FollowStatus.ACCEPTED, page, limit);
    }

    async listIncomingRequests(userId: UserId, page: number, limit: number) {
        return this.listBy("follower", userId, FollowStatus.PENDING, page, limit);
    }

    async listOutgoingRequests(userId: UserId, page: number, limit: number) {
        return this.listBy("following", userId, FollowStatus.PENDING, page, limit);
    }

    async acceptAllPending(userId: UserId): Promise<Types.ObjectId[]> {
        const acceptedAt = new Date();
        const result = await this.model.updateMany(
            { following: userId, status: FollowStatus.PENDING },
            { $set: { status: FollowStatus.ACCEPTED, acceptedAt } }
        );
        if (result.modifiedCount === 0) return [];

        const rows = await this.model
            .find({ following: userId, status: FollowStatus.ACCEPTED, acceptedAt })
            .select("follower")
            .lean<{ follower: Types.ObjectId }[]>();
        return rows.map((row) => row.follower);
    }

    async relationshipMap(viewerId: UserId, targetIds: Types.ObjectId[]): Promise<Map<string, FollowStatus>> {
        if (targetIds.length === 0) return new Map();
        const rows = await this.model
            .find({ follower: viewerId, following: { $in: targetIds } })
            .select("following status")
            .lean<{ following: Types.ObjectId; status: FollowStatus }[]>();
        return new Map(rows.map((row) => [String(row.following), row.status]));
    }

    async findConnectedIds(userId: UserId): Promise<Types.ObjectId[]> {
        const rows = await this.model.find({ follower: userId }).select("following").lean<{ following: Types.ObjectId }[]>();
        return rows.map((row) => row.following);
    }

    async findFriendsOfFriends(
        userId: UserId,
        excludeIds: Types.ObjectId[],
        limit: number
    ): Promise<{ _id: Types.ObjectId; mutualCount: number }[]> {
        const id = toObjectId(userId);
        return this.model.aggregate<{ _id: Types.ObjectId; mutualCount: number }>([
            { $match: { follower: id, status: FollowStatus.ACCEPTED } },
            {
                $lookup: {
                    from: this.model.collection.name,
                    let: { middle: "$following" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$follower", "$$middle"] },
                                        { $eq: ["$status", FollowStatus.ACCEPTED] },
                                    ],
                                },
                            },
                        },
                        { $project: { _id: 0, following: 1 } },
                    ],
                    as: "secondDegree",
                },
            },
            { $unwind: "$secondDegree" },
            { $match: { "secondDegree.following": { $nin: excludeIds } } },
            { $group: { _id: "$secondDegree.following", mutualCount: { $sum: 1 } } },
            { $sort: { mutualCount: -1, _id: 1 } },
            { $limit: limit },
        ]);
    }
}

export const followRepository = new FollowRepository();
