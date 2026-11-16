import type { AuthUser } from "../lib/middleware/auth.guard.js";

declare global {
    namespace Express {
        interface Request {
            correlationId: string;
            user?: AuthUser;
        }
    }
}

export {};
