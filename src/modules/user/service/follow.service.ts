import { Types, type HydratedDocument } from "mongoose";
import { buildPagination, type Pagination } from "../../../lib/utils/pagination.js";
import { FollowStatus, RelationshipStatus } from "../enum/enum.js";
import {
    alreadyFollowing,
    alreadyRequested,
    cannotFollowSelf,
    followRequestNotFound,
    notAFollower,
    notFollowing,
    privateAccount,
    userNotFound,
} from "../errors.js";
import type { IUser, PublicUser } from "../interface/user.interface.js";
import { followRepository, type FollowListItem } from "../repository/follow.repository.js";
import { userRepository } from "../repository/user.repository.js";

export interface UserWithRelationship extends PublicUser {
    relationship: RelationshipStatus;
}

export interface FollowListResult {
    items: { user: UserWithRelationship; since: Date }[];
    pagination: Pagination;
}

const isDuplicateKey = (error: unknown): boolean =>
    typeof error === "object" && error !== null && "code" in error && error.code === 11000;

export const toRelationship = (status: FollowStatus | undefined): RelationshipStatus => {
    if (status === FollowStatus.ACCEPTED) return RelationshipStatus.FOLLOWING;
    if (status === FollowStatus.PENDING) return RelationshipStatus.REQUESTED;
    return RelationshipStatus.NONE;
};

class FollowService {
    async getVisibleUser(userId: string): Promise<HydratedDocument<IUser>> {
        const user = await userRepository.findActiveById(userId);
        if (!user || !user.isVerified) throw userNotFound();
        return user;
    }

    async canViewConnections(viewerId: string | undefined, target: HydratedDocument<IUser>): Promise<boolean> {
        if (!target.settings.isPrivate) return true;
        if (!viewerId) return false;
        if (viewerId === String(target._id)) return true;
        return followRepository.isAcceptedFollower(viewerId, target._id);
    }

    async withRelationships(viewerId: string | undefined, users: PublicUser[]): Promise<UserWithRelationship[]> {
        if (!viewerId) return users.map((user) => ({ ...user, relationship: RelationshipStatus.NONE }));

        const map = await followRepository.relationshipMap(
            viewerId,
            users.map((user) => user._id)
        );

        return users.map((user) => {
            const id = String(user._id);
            const relationship = id === viewerId ? RelationshipStatus.SELF : toRelationship(map.get(id));
            return { ...user, relationship };
        });
    }

    private async decorateList(
        viewerId: string | undefined,
        result: { items: FollowListItem[]; total: number },
        page: number,
        limit: number
    ): Promise<FollowListResult> {
        const users = await this.withRelationships(
            viewerId,
            result.items.map((item) => item.user)
        );

        return {
            items: users.map((user, index) => ({ user, since: result.items[index]?.since ?? new Date(0) })),
            pagination: buildPagination(page, limit, result.total),
        };
    }

    async follow(userId: string, targetId: string): Promise<{ relationship: RelationshipStatus }> {
        if (userId === targetId) throw cannotFollowSelf();

        const target = await this.getVisibleUser(targetId);
        const status = target.settings.isPrivate ? FollowStatus.PENDING : FollowStatus.ACCEPTED;

        try {
            await followRepository.create({
                follower: new Types.ObjectId(userId),
                following: target._id,
                status,
                ...(status === FollowStatus.ACCEPTED ? { acceptedAt: new Date() } : {}),
            });
        } catch (error) {
            if (!isDuplicateKey(error)) throw error;
            const existing = await followRepository.findRelation(userId, targetId);
            throw existing?.status === FollowStatus.PENDING ? alreadyRequested() : alreadyFollowing();
        }

        if (status === FollowStatus.ACCEPTED) {
            await Promise.all([
                userRepository.incrementCounters(userId, { followingCount: 1 }),
                userRepository.incrementCounters(target._id, { followersCount: 1 }),
            ]);
        }

        return { relationship: toRelationship(status) };
    }

    async unfollow(userId: string, targetId: string): Promise<{ wasRequest: boolean }> {
        const removed = await followRepository.deleteOne({ follower: userId, following: targetId });
        if (!removed) throw notFollowing();

        if (removed.status === FollowStatus.ACCEPTED) {
            await Promise.all([
                userRepository.incrementCounters(userId, { followingCount: -1 }),
                userRepository.incrementCounters(targetId, { followersCount: -1 }),
            ]);
        }

        return { wasRequest: removed.status === FollowStatus.PENDING };
    }

    async removeFollower(userId: string, followerId: string): Promise<void> {
        const removed = await followRepository.deleteOne({
            follower: followerId,
            following: userId,
            status: FollowStatus.ACCEPTED,
        });
        if (!removed) throw notAFollower();

        await Promise.all([
            userRepository.incrementCounters(userId, { followersCount: -1 }),
            userRepository.incrementCounters(followerId, { followingCount: -1 }),
        ]);
    }

    async acceptRequest(userId: string, requesterId: string): Promise<void> {
        const accepted = await followRepository.updateOne(
            { follower: requesterId, following: userId, status: FollowStatus.PENDING },
            { $set: { status: FollowStatus.ACCEPTED, acceptedAt: new Date() } }
        );
        if (!accepted) throw followRequestNotFound();

        await Promise.all([
            userRepository.incrementCounters(userId, { followersCount: 1 }),
            userRepository.incrementCounters(requesterId, { followingCount: 1 }),
        ]);
    }

    async declineRequest(userId: string, requesterId: string): Promise<void> {
        const removed = await followRepository.deleteOne({
            follower: requesterId,
            following: userId,
            status: FollowStatus.PENDING,
        });
        if (!removed) throw followRequestNotFound();
    }

    async acceptAllPending(userId: string): Promise<number> {
        const followerIds = await followRepository.acceptAllPending(userId);
        if (followerIds.length === 0) return 0;

        await Promise.all([
            userRepository.incrementCounters(userId, { followersCount: followerIds.length }),
            userRepository.incrementFollowingForMany(followerIds, 1),
        ]);

        return followerIds.length;
    }

    async listFollowers(
        viewerId: string | undefined,
        targetId: string,
        page: number,
        limit: number
    ): Promise<FollowListResult> {
        const target = await this.getVisibleUser(targetId);
        if (!(await this.canViewConnections(viewerId, target))) throw privateAccount();
        const result = await followRepository.listFollowers(target._id, page, limit);
        return this.decorateList(viewerId, result, page, limit);
    }

    async listFollowing(
        viewerId: string | undefined,
        targetId: string,
        page: number,
        limit: number
    ): Promise<FollowListResult> {
        const target = await this.getVisibleUser(targetId);
        if (!(await this.canViewConnections(viewerId, target))) throw privateAccount();
        const result = await followRepository.listFollowing(target._id, page, limit);
        return this.decorateList(viewerId, result, page, limit);
    }

    async listIncomingRequests(userId: string, page: number, limit: number): Promise<FollowListResult> {
        const result = await followRepository.listIncomingRequests(userId, page, limit);
        return this.decorateList(userId, result, page, limit);
    }

    async listOutgoingRequests(userId: string, page: number, limit: number): Promise<FollowListResult> {
        const result = await followRepository.listOutgoingRequests(userId, page, limit);
        return this.decorateList(userId, result, page, limit);
    }
}

export const followService = new FollowService();
