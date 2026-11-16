import { Redis } from "ioredis";
import type { ICacheProvider } from "./cache.interface.js";

export interface IRedisConfig {
    host: string;
    port: number;
    password?: string;
}

export class RedisCacheProvider implements ICacheProvider {
    private client: Redis;

    // setup config - general
    constructor(config: IRedisConfig) {
        this.client = new Redis({
            host: config.host,
            port: config.port,
            password: config.password,
            lazyConnect: true,
            maxLoadingRetryTime: 3,
        });
        // this.client = new Redis(config.url);

        this.client.on("error", (err: Error) =>
            console.log("redis server error:", err.message)
        );
        this.client
            .connect()
            .catch((err: Error) =>
                console.log("fail to connect to redis", err.message)
            );
    }

    async set(key: string, value: string, ttl?: number): Promise<"OK"> {
        if (ttl) {
            return this.client.set(key, value, "EX", ttl);
        }
        return this.client.set(key, value);
    }

    async setIfNotExists(
        key: string,
        value: string,
        ttl: number
    ): Promise<boolean> {
        const result = await this.client.set(key, value, "EX", ttl, "NX");
        return result === "OK";
    }

    async get(key: string): Promise<string | null> {
        return this.client.get(key);
    }

    async del(...keys: string[]): Promise<number> {
        if (keys.length === 0) return 0;
        return this.client.del(...keys);
    }

    async increment(key: string): Promise<number> {
        return this.client.incr(key);
    }

    async expire(key: string, ttl: number): Promise<number> {
        return this.client.expire(key, ttl);
    }

    async ttl(key: string): Promise<number> {
        return this.client.ttl(key);
    }
}