import { Redis } from "@upstash/redis";
import { logger } from "../logger/logger.js";
import type { ICacheProvider } from "./cache.interface.js";

export interface IUpstashConfig {
    keyPrefix?: string | undefined;
    url: string;
    token: string;
}

export class UpstashCacheProvider implements ICacheProvider {
    private readonly prefix: string;
    private readonly client: Redis;
    private ready = false;

    constructor(config: IUpstashConfig) {
        this.prefix = config.keyPrefix ?? "";
        this.client = new Redis({
            url: config.url,
            token: config.token,
            automaticDeserialization: false,
            enableTelemetry: false,
        });
    }

    async connect(): Promise<void> {
        try {
            await this.client.ping();
            this.ready = true;
            logger.info("Connected to Upstash Redis");
        } catch (error) {
            logger.warn("Failed to connect to Upstash Redis, continuing without cache", {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    private k(key: string): string {
        return `${this.prefix}${key}`;
    }

    isReady(): boolean {
        return this.ready;
    }

    async get(key: string): Promise<string | null> {
        return this.client.get<string>(this.k(key));
    }

    async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
        if (ttlSeconds) {
            await this.client.set(this.k(key), value, { ex: ttlSeconds });
            return;
        }
        await this.client.set(this.k(key), value);
    }

    async setIfNotExists(key: string, value: string, ttlSeconds: number): Promise<boolean> {
        const result = await this.client.set(this.k(key), value, { nx: true, ex: ttlSeconds });
        return result === "OK";
    }

    async del(...keys: string[]): Promise<number> {
        if (keys.length === 0) return 0;
        return this.client.del(...keys.map((key) => this.k(key)));
    }

    async increment(key: string): Promise<number> {
        return this.client.incr(this.k(key));
    }

    async expire(key: string, ttlSeconds: number): Promise<boolean> {
        return (await this.client.expire(this.k(key), ttlSeconds)) === 1;
    }

    async ttl(key: string): Promise<number> {
        return this.client.ttl(this.k(key));
    }

    async disconnect(): Promise<void> {
        this.ready = false;
    }
}
