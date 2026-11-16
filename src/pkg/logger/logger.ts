export type LogLevel = "error" | "warn" | "info" | "debug";

class Logger {
    log(level: LogLevel, message: string, metaData: Record<string, unknown> = {}): void {
        const line = JSON.stringify({
            level,
            message,
            timestamp: new Date().toISOString(),
            ...metaData,
        });

        if (level === "error") {
            console.error(line);
        } else if (level === "warn") {
            console.warn(line);
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

    info(message: string, metaData: Record<string, unknown> = {}): void {
        this.log("info", message, metaData);
    }

    debug(message: string, metaData: Record<string, unknown> = {}): void {
        this.log("debug", message, metaData);
    }
}

export const logger = new Logger();
