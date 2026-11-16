export interface AppErrorExtras {
    code?: string;
    details?: Record<string, unknown>;
}

export class AppError extends Error {
    readonly statusCode: number;
    readonly code: string | undefined;
    readonly details: Record<string, unknown> | undefined;
    readonly isOperational = true;

    constructor(message: string, statusCode = 500, extras: AppErrorExtras = {}) {
        super(message);
        this.name = "AppError";
        this.statusCode = statusCode;
        this.code = extras.code;
        this.details = extras.details;
        Error.captureStackTrace(this, this.constructor);
    }
}

export const notFound = (message = "Resource not found", code = "NOT_FOUND") =>
    new AppError(message, 404, { code });

export const forbidden = (message = "You don't have permission to do this", code = "FORBIDDEN") =>
    new AppError(message, 403, { code });

export const unauthorized = (message = "Unauthorized", code = "UNAUTHORIZED") =>
    new AppError(message, 401, { code });

export const badRequest = (message: string, code = "BAD_REQUEST") => new AppError(message, 400, { code });
