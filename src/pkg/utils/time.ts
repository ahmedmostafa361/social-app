export type TimeUnit = "milliseconds" | "seconds" | "minutes" | "hours" | "days";

const MS_PER_UNIT: Record<TimeUnit, number> = {
    milliseconds: 1,
    seconds: 1000,
    minutes: 60 * 1000,
    hours: 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
};

export function toMs(time: number, unit: TimeUnit): number {
    return time * MS_PER_UNIT[unit];
}

export function toSeconds(time: number, unit: TimeUnit): number {
    return Math.floor(toMs(time, unit) / 1000);
}

export function addTime(time: number, unit: TimeUnit, from: Date = new Date()): Date {
    return new Date(from.getTime() + toMs(time, unit));
}
