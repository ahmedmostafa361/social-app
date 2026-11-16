export type TimeUnit = "milliseconds" | "seconds" | "minutes" | "hours" | "days";

export function toMs(time: number, unit: TimeUnit): number {
    switch (unit) {
        case "seconds":
            return time * 1000;
        case "minutes":
            return time * 60 * 1000;
        case "hours":
            return time * 60 * 60 * 1000;
        case "days":
            return time * 24 * 60 * 60 * 1000;
        case "milliseconds":
        default:
            return time;
    }
}

export function toSeconds(time: number, unit: TimeUnit): number {
    switch (unit) {
        case "milliseconds":
            return Math.floor(time / 1000);
        case "minutes":
            return time * 60;
        case "hours":
            return time * 60 * 60;
        case "days":
            return time * 24 * 60 * 60;
        case "seconds":
        default:
            return time;
    }
}

export function addTime(time: number, unit: TimeUnit, from: Date = new Date()): Date {
    return new Date(from.getTime() + toMs(time, unit));
}