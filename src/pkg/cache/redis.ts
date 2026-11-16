import { Redis, type RedisOptions } from "ioredis";
import { logger } from "../logger/logger.js";
import type { ICacheProvider } from "./cache.interface.js";

export interface IRedisConfig {
    host: string;
    port: number;
    password?: string | undefined;
}

export class RedisCacheProvider implements ICacheProvider {
    private readonly client: Redis;

    constructor(config: IRedisConfig) {
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

        this.client.on("error", (error: Error) => logger.warn("Redis error", { error: error.message }));
        this.client.on("ready", () => logger.info("Connected to Redis"));
    }

    async connect(): Promise<void> {
        try {
            await this.client.connect();
        } catch (error) {
            logger.warn("Failed to connect to Redis, continuing without cache", {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    async get(key: string): Promise<string | null> {
        return this.client.get(key);
    }

    async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
        if (ttlSeconds) {
            await this.client.set(key, value, "EX", ttlSeconds);
            return;
        }
        await this.client.set(key, value);
    }

    async setIfNotExists(key: string, value: string, ttlSeconds: number): Promise<boolean> {
        const result = await this.client.set(key, value, "EX", ttlSeconds, "NX");
        return result === "OK";
    }

    async del(...keys: string[]): Promise<number> {
        if (keys.length === 0) return 0;
        return this.client.del(...keys);
    }

    async increment(key: string): Promise<number> {
        return this.client.incr(key);
    }

    async expire(key: string, ttlSeconds: number): Promise<boolean> {
        return (await this.client.expire(key, ttlSeconds)) === 1;
    }

    async ttl(key: string): Promise<number> {
        return this.client.ttl(key);
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
