import { Router } from "express";
import { authGuard, optionalGuard } from "../../lib/middleware/auth.guard.js";
import { rateLimit } from "../../lib/middleware/rate-limit.js";
import { userController } from "./controller/user.controller.js";

export const userRouter: Router = Router();

const searchLimit = rateLimit({ name: "user-search", windowSeconds: 60, max: 30 });
const followLimit = rateLimit({ name: "follow", windowSeconds: 3600, max: 200 });

userRouter.get("/me", authGuard, userController.getMe);
userRouter.patch("/me", authGuard, userController.updateMe);
userRouter.get("/me/settings", authGuard, userController.getSettings);
userRouter.patch("/me/settings", authGuard, userController.updateSettings);
userRouter.patch("/me/password", authGuard, userController.changePassword);

userRouter.get("/me/followers", authGuard, userController.myFollowers);
userRouter.get("/me/following", authGuard, userController.myFollowing);
userRouter.delete("/me/followers/:userId", authGuard, userController.removeFollower);

userRouter.get("/me/follow-requests", authGuard, userController.incomingRequests);
userRouter.get("/me/follow-requests/sent", authGuard, userController.outgoingRequests);
userRouter.post("/me/follow-requests/:userId/accept", authGuard, userController.acceptRequest);
userRouter.delete("/me/follow-requests/:userId", authGuard, userController.declineRequest);

userRouter.get("/search", optionalGuard, searchLimit, userController.search);
userRouter.get("/suggestions", authGuard, userController.suggestions);
userRouter.get("/username/:userName", optionalGuard, userController.getProfileByUserName);

userRouter.get("/:userId", optionalGuard, userController.getProfileById);
userRouter.get("/:userId/followers", optionalGuard, userController.followers);
userRouter.get("/:userId/following", optionalGuard, userController.following);
userRouter.post("/:userId/follow", authGuard, followLimit, userController.follow);
userRouter.delete("/:userId/follow", authGuard, userController.unfollow);
