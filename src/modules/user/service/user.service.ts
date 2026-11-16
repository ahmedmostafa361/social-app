import type { HydratedDocument, Types } from "mongoose";
import { sendEmailInBackground } from "../../../lib/email/email.js";
import { getPasswordChangedEmail } from "../../../lib/email/templates/email.templates.js";
import { buildPagination, type Pagination } from "../../../lib/utils/pagination.js";
import { randomUserNameFrom } from "../../../lib/utils/username.js";
import { comparePassword, hashPassword } from "../../../pkg/utils/hash.js";
import { escapeRegex } from "../../../pkg/utils/string.js";
import { sessionRepository } from "../../auth/repository/session.repository.js";
import type { ChangePasswordDto, UpdateProfileDto, UpdateSettingsDto } from "../dto/user.dto.js";
import { FollowStatus, RelationshipStatus } from "../enum/enum.js";
import {
    invalidCurrentPassword,
    passwordRequired,
    samePassword,
    userNameTaken,
    userNotFound,
} from "../errors.js";
import type { IUser, IUserSettings, PublicUser, UserJSON } from "../interface/user.interface.js";
import { followRepository } from "../repository/follow.repository.js";
import { toPublicUser, userRepository } from "../repository/user.repository.js";
import { followService, toRelationship, type UserWithRelationship } from "./follow.service.js";

export interface ProfileView extends UserWithRelationship {
    followsYou: boolean;
    canViewConnections: boolean;
    joinedAt: Date;
}

export interface Suggestion {
    user: PublicUser;
    mutualCount: number;
    reason: "followed_by_people_you_follow" | "popular";
}

const NULLABLE_PROFILE_FIELDS = ["phoneNumber", "gender", "dob"] as const;

class UserService {
    private async getActiveUser(userId: string): Promise<HydratedDocument<IUser>> {
        const user = await userRepository.findActiveById(userId);
        if (!user) throw userNotFound();
        return user;
    }

    async generateUniqueUserName(source: string): Promise<string> {
        for (let attempt = 0; attempt < 5; attempt += 1) {
            const candidate = randomUserNameFrom(source);
            if (!(await userRepository.userNameExists(candidate))) return candidate;
        }
        return `user${Date.now().toString(36)}`;
    }

    async getMe(userId: string): Promise<UserJSON & { pendingFollowRequests: number }> {
        const user = await this.getActiveUser(userId);
        const pendingFollowRequests = await followRepository.count({
            following: user._id,
            status: FollowStatus.PENDING,
        });
        return { ...user.toJSON(), pendingFollowRequests };
    }

    private async buildProfile(viewerId: string | undefined, user: HydratedDocument<IUser>): Promise<ProfileView> {
        const targetId = String(user._id);
        const isSelf = viewerId === targetId;

        const [outgoing, incoming, canViewConnections] = await Promise.all([
            viewerId && !isSelf ? followRepository.findRelation(viewerId, user._id) : null,
            viewerId && !isSelf ? followRepository.findRelation(user._id, viewerId) : null,
            followService.canViewConnections(viewerId, user),
        ]);

        return {
            ...toPublicUser(user),
            joinedAt: user.createdAt,
            relationship: isSelf ? RelationshipStatus.SELF : toRelationship(outgoing?.status),
            followsYou: incoming?.status === FollowStatus.ACCEPTED,
            canViewConnections,
        };
    }

    async getProfileById(viewerId: string | undefined, userId: string): Promise<ProfileView> {
        return this.buildProfile(viewerId, await followService.getVisibleUser(userId));
    }

    async getProfileByUserName(viewerId: string | undefined, userName: string): Promise<ProfileView> {
        const user = await userRepository.findActiveByUserName(userName);
        if (!user) throw userNotFound();
        return this.buildProfile(viewerId, user);
    }

    async updateProfile(userId: string, data: UpdateProfileDto): Promise<UserJSON> {
        const user = await this.getActiveUser(userId);

        if (data.userName && data.userName !== user.userName) {
            if (await userRepository.userNameExists(data.userName, user._id)) throw userNameTaken();
        }

        const $set: Record<string, unknown> = {};
        const $unset: Record<string, 1> = {};

        for (const [key, value] of Object.entries(data)) {
            if (value === undefined) continue;
            if (value === null && (NULLABLE_PROFILE_FIELDS as readonly string[]).includes(key)) {
                $unset[key] = 1;
            } else {
                $set[key] = value;
            }
        }

        const updated = await userRepository.updateOne(
            { _id: user._id },
            {
                ...(Object.keys($set).length ? { $set } : {}),
                ...(Object.keys($unset).length ? { $unset } : {}),
            }
        );
        if (!updated) throw userNotFound();
        return updated.toJSON();
    }

    async getSettings(userId: string): Promise<IUserSettings> {
        const user = await this.getActiveUser(userId);
        return { isPrivate: user.settings.isPrivate, emailNotifications: user.settings.emailNotifications };
    }

    async updateSettings(
        userId: string,
        settings: UpdateSettingsDto
    ): Promise<IUserSettings & { acceptedFollowRequests: number }> {
        const user = await this.getActiveUser(userId);
        const wasPrivate = user.settings.isPrivate;

        const $set = Object.fromEntries(
            Object.entries(settings)
                .filter(([, value]) => value !== undefined)
                .map(([key, value]) => [`settings.${key}`, value])
        );

        const updated = await userRepository.updateOne({ _id: user._id }, { $set });
        if (!updated) throw userNotFound();

        const acceptedFollowRequests =
            wasPrivate && settings.isPrivate === false ? await followService.acceptAllPending(userId) : 0;

        return {
            isPrivate: updated.settings.isPrivate,
            emailNotifications: updated.settings.emailNotifications,
            acceptedFollowRequests,
        };
    }

    async changePassword(
        userId: string,
        sessionId: string,
        { currentPassword, newPassword }: ChangePasswordDto
    ): Promise<{ otherSessionsRevoked: number }> {
        const user = await userRepository.findActiveById(userId, true);
        if (!user) throw userNotFound();

        if (user.password) {
            if (!currentPassword) throw passwordRequired();
            if (!(await comparePassword(currentPassword, user.password))) throw invalidCurrentPassword();
            if (await comparePassword(newPassword, user.password)) throw samePassword();
        }

        await userRepository.updateOne(
            { _id: user._id },
            { $set: { password: await hashPassword(newPassword), passwordChangedAt: new Date() } }
        );

        const otherSessionsRevoked = await sessionRepository.deleteUserSessions(user._id, sessionId);

        if (user.settings.emailNotifications) {
            const { subject, html } = getPasswordChangedEmail(user.userName);
            sendEmailInBackground(user.email, subject, html);
        }

        return { otherSessionsRevoked };
    }

    async search(
        query: string,
        viewerId: string | undefined,
        page: number,
        limit: number
    ): Promise<{ users: UserWithRelationship[]; pagination: Pagination }> {
        const { users, total } = await userRepository.search({
            regex: `^${escapeRegex(query.toLowerCase())}`,
            excludeIds: viewerId ? [viewerId] : [],
            page,
            limit,
        });

        return {
            users: await followService.withRelationships(viewerId, users),
            pagination: buildPagination(page, limit, total),
        };
    }

    async suggestions(userId: string, limit: number): Promise<Suggestion[]> {
        const user = await this.getActiveUser(userId);
        const connected = await followRepository.findConnectedIds(user._id);
        const exclude: Types.ObjectId[] = [user._id, ...connected];

        const ranked = await followRepository.findFriendsOfFriends(user._id, exclude, limit);
        const rankedUsers = await userRepository.findPublicByIds(ranked.map((row) => row._id));
        const byId = new Map(rankedUsers.map((item) => [String(item._id), item]));

        const suggestions: Suggestion[] = ranked.flatMap((row) => {
            const found = byId.get(String(row._id));
            return found ? [{ user: found, mutualCount: row.mutualCount, reason: "followed_by_people_you_follow" as const }] : [];
        });

        if (suggestions.length < limit) {
            const popular = await userRepository.findPopular(
                [...exclude, ...suggestions.map((item) => item.user._id)],
                limit - suggestions.length
            );
            suggestions.push(...popular.map((item) => ({ user: item, mutualCount: 0, reason: "popular" as const })));
        }

        return suggestions;
    }
}

export const userService = new UserService();
