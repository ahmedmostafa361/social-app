import { Router } from "express";
import { authRouter } from "./modules/auth/route.js";
import { userRouter } from "./modules/user/route.js";

export const router: Router = Router();

router.use("/auth", authRouter);
router.use("/users", userRouter);
