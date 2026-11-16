import { logger } from "../../pkg/logger/logger.js";

export const runInBackground = (task: () => Promise<unknown>): void => {
    void Promise.resolve()
        .then(task)
        .catch((error: unknown) =>
            logger.warn("Background task failed", {
                error: error instanceof Error ? error.message : String(error),
            })
        );
};
