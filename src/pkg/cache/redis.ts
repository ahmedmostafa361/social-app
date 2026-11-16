import { Redis, type RedisOptions } from "ioredis";
import { logger } from "../logger/logger.js";
import type { ICacheProvider } from "./cache.interface.js";

export interface IRedisConfig {
    keyPrefix?: string | undefined;
    host: string;
    port: number;
    password?: string | undefined;
}

export class RedisCacheProvider implements ICacheProvider {
    private readonly prefix: string;
    private readonly client: Redis;
    private hasConnected = false;

    constructor(config: IRedisConfig) {
        this.prefix = config.keyPrefix ?? "";
        const options: RedisOptions = {
            host: config.host,
            port: config.port,
            lazyConnect: true,
            enableOfflineQueue: false,
            maxRetriesPerRequest: 1,
            retryStrategy: (times) => Math.min(times * 500, 5000),
        };
        if (config.password) options.password = config.password;

        this.client = new Redis(options);

        this.client.on("ready", () => {
            this.hasConnected = true;
            logger.info("Connected to Redis");
        });
        this.client.on("error", (error: Error) => {
            if (this.hasConnected) logger.warn("Redis error", { error: error.message });
        });
    }

    async connect(): Promise<void> {
        try {
            await this.client.connect();
        } catch (error) {
            this.client.disconnect();
            logger.warn("Failed to connect to Redis, continuing without cache", {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    private k(key: string): string {
        return `${this.prefix}${key}`;
    }

    isReady(): boolean {
        return this.client.status === "ready";
    }

    async get(key: string): Promise<string | null> {
        return this.client.get(this.k(key));
    }

    async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
        if (ttlSeconds) {
            await this.client.set(this.k(key), value, "EX", ttlSeconds);
            return;
        }
        await this.client.set(this.k(key), value);
    }

    async setIfNotExists(key: string, value: string, ttlSeconds: number): Promise<boolean> {
        const result = await this.client.set(this.k(key), value, "EX", ttlSeconds, "NX");
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
        if (this.client.status === "end") return;
        try {
            await this.client.quit();
        } catch {
            this.client.disconnect();
        }
    }
}
