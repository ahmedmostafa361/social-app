import type { Request, Response } from "express";
import { currentUser } from "../../../lib/middleware/auth.guard.js";
import { validate } from "../../../lib/validation/validation.js";
import {
    changePasswordSchema,
    paginationSchema,
    searchUsersSchema,
    suggestionsSchema,
    updateProfileSchema,
    updateSettingsSchema,
    userIdParamsSchema,
    userNameParamsSchema,
} from "../dto/user.dto.js";
import { RelationshipStatus } from "../enum/enum.js";
import { followService } from "../service/follow.service.js";
import { userService } from "../service/user.service.js";

class UserController {
    getMe = async (req: Request, res: Response): Promise<void> => {
        const user = await userService.getMe(currentUser(req).userId);
        res.status(200).json({ message: "Your profile", success: true, data: user });
    };

    updateMe = async (req: Request, res: Response): Promise<void> => {
        const data = validate(updateProfileSchema, req.body);
        const user = await userService.updateProfile(currentUser(req).userId, data);
        res.status(200).json({ message: "Profile updated", success: true, data: user });
    };

    getSettings = async (req: Request, res: Response): Promise<void> => {
        const settings = await userService.getSettings(currentUser(req).userId);
        res.status(200).json({ message: "Your settings", success: true, data: settings });
    };

    updateSettings = async (req: Request, res: Response): Promise<void> => {
        const data = validate(updateSettingsSchema, req.body);
        const settings = await userService.updateSettings(currentUser(req).userId, data);
        res.status(200).json({ message: "Settings updated", success: true, data: settings });
    };

    changePassword = async (req: Request, res: Response): Promise<void> => {
        const { userId, sessionId } = currentUser(req);
        const data = validate(changePasswordSchema, req.body);
        const result = await userService.changePassword(userId, sessionId, data);
        res.status(200).json({
            message: "Password changed. You were logged out of your other devices",
            success: true,
            data: result,
        });
    };

    search = async (req: Request, res: Response): Promise<void> => {
        const { q, page, limit } = validate(searchUsersSchema, req.query);
        const { users, pagination } = await userService.search(q, req.user?.userId, page, limit);
        res.status(200).json({ message: "Search results", success: true, data: users, pagination });
    };

    suggestions = async (req: Request, res: Response): Promise<void> => {
        const { limit } = validate(suggestionsSchema, req.query);
        const data = await userService.suggestions(currentUser(req).userId, limit);
        res.status(200).json({ message: "Suggested users", success: true, data });
    };

    getProfileByUserName = async (req: Request, res: Response): Promise<void> => {
        const { userName } = validate(userNameParamsSchema, req.params);
        const profile = await userService.getProfileByUserName(req.user?.userId, userName);
        res.status(200).json({ message: "User profile", success: true, data: profile });
    };

    getProfileById = async (req: Request, res: Response): Promise<void> => {
        const { userId } = validate(userIdParamsSchema, req.params);
        const profile = await userService.getProfileById(req.user?.userId, userId);
        res.status(200).json({ message: "User profile", success: true, data: profile });
    };

    follow = async (req: Request, res: Response): Promise<void> => {
        const { userId } = validate(userIdParamsSchema, req.params);
        const data = await followService.follow(currentUser(req).userId, userId);
        const requested = data.relationship === RelationshipStatus.REQUESTED;
        res.status(requested ? 202 : 201).json({
            message: requested ? "Follow request sent" : "You are now following this user",
            success: true,
            data,
        });
    };

    unfollow = async (req: Request, res: Response): Promise<void> => {
        const { userId } = validate(userIdParamsSchema, req.params);
        const { wasRequest } = await followService.unfollow(currentUser(req).userId, userId);
        res.status(200).json({
            message: wasRequest ? "Follow request cancelled" : "Unfollowed",
            success: true,
            data: { relationship: RelationshipStatus.NONE },
        });
    };

    removeFollower = async (req: Request, res: Response): Promise<void> => {
        const { userId } = validate(userIdParamsSchema, req.params);
        await followService.removeFollower(currentUser(req).userId, userId);
        res.status(200).json({ message: "Follower removed", success: true });
    };

    followers = async (req: Request, res: Response): Promise<void> => {
        const { userId } = validate(userIdParamsSchema, req.params);
        const { page, limit } = validate(paginationSchema, req.query);
        const { items, pagination } = await followService.listFollowers(req.user?.userId, userId, page, limit);
        res.status(200).json({ message: "Followers", success: true, data: items, pagination });
    };

    following = async (req: Request, res: Response): Promise<void> => {
        const { userId } = validate(userIdParamsSchema, req.params);
        const { page, limit } = validate(paginationSchema, req.query);
        const { items, pagination } = await followService.listFollowing(req.user?.userId, userId, page, limit);
        res.status(200).json({ message: "Following", success: true, data: items, pagination });
    };

    myFollowers = async (req: Request, res: Response): Promise<void> => {
        const { userId } = currentUser(req);
        const { page, limit } = validate(paginationSchema, req.query);
        const { items, pagination } = await followService.listFollowers(userId, userId, page, limit);
        res.status(200).json({ message: "Your followers", success: true, data: items, pagination });
    };

    myFollowing = async (req: Request, res: Response): Promise<void> => {
        const { userId } = currentUser(req);
        const { page, limit } = validate(paginationSchema, req.query);
        const { items, pagination } = await followService.listFollowing(userId, userId, page, limit);
        res.status(200).json({ message: "You follow", success: true, data: items, pagination });
    };

    incomingRequests = async (req: Request, res: Response): Promise<void> => {
        const { page, limit } = validate(paginationSchema, req.query);
        const { items, pagination } = await followService.listIncomingRequests(currentUser(req).userId, page, limit);
        res.status(200).json({ message: "Follow requests", success: true, data: items, pagination });
    };

    outgoingRequests = async (req: Request, res: Response): Promise<void> => {
        const { page, limit } = validate(paginationSchema, req.query);
        const { items, pagination } = await followService.listOutgoingRequests(currentUser(req).userId, page, limit);
        res.status(200).json({ message: "Sent follow requests", success: true, data: items, pagination });
    };

    acceptRequest = async (req: Request, res: Response): Promise<void> => {
        const { userId } = validate(userIdParamsSchema, req.params);
        await followService.acceptRequest(currentUser(req).userId, userId);
        res.status(200).json({ message: "Follow request accepted", success: true });
    };

    declineRequest = async (req: Request, res: Response): Promise<void> => {
        const { userId } = validate(userIdParamsSchema, req.params);
        await followService.declineRequest(currentUser(req).userId, userId);
        res.status(200).json({ message: "Follow request declined", success: true });
    };
}

export const userController = new UserController();
