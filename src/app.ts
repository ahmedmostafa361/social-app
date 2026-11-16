import express, { Express } from "express";
import { router } from "./route";

export function createApp(): Express {
    const app: Express = express();

    app.use(express.json());
    app.use("/api", router);

    return app;
}