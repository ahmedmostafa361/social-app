import fs from "node:fs/promises";
import { logger } from "../logger/logger.js";

export const removeFile = async (filePath?: string): Promise<void> => {
    if (!filePath) return;
    try {
        await fs.unlink(filePath);
    } catch (error: unknown) {
        const err = error as NodeJS.ErrnoException;
        if (err.code !== "ENOENT") {
            logger.warn("Failed to delete file", { filePath, error: err.message });
        }
    }
};

export const removeFiles = async (filePaths: (string | undefined)[] = []): Promise<void> => {
    await Promise.all(filePaths.filter(Boolean).map((filePath) => removeFile(filePath)));
};