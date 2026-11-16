export type LogLevel = "log" | "error" | "warn" | "debug" | "info";

class Logger {
    private static instance: Logger;

    constructor() {
        if (!Logger.instance) {
            Logger.instance = this;
        }
        return Logger.instance;
    }

    log(level: LogLevel, message: string, metaData: Record<string, unknown> = {}): void {
        const messageObj = {
            level,
            message,
            timestamp: new Date().toISOString(),
            ...metaData,
        };
        const line = JSON.stringify(messageObj);
        if (level === "error") {
            console.error(line);
        } else {
            console.log(line);
        }
    }

    error(message: string, metaData: Record<string, unknown> = {}): void {
        this.log("error", message, metaData);
    }

    warn(message: string, metaData: Record<string, unknown> = {}): void {
        this.log("warn", message, metaData);
    }

    debug(message: string, metaData: Record<string, unknown> = {}): void {
        this.log("debug", message, metaData);
    }

    info(message: string, metaData: Record<string, unknown> = {}): void {
        this.log("info", message, metaData);
    }
}

export const logger = new Logger();