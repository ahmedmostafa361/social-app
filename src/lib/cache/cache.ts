import type { ICacheProvider } from "../../pkg/cache/cache.interface.js";
import { RedisCacheProvider } from "../../pkg/cache/redis.js";
import { UpstashCacheProvider } from "../../pkg/cache/upstash.js";
import { env } from "../config/env.js";

const KEY_PREFIX = "social:";

const createCacheProvider = (): ICacheProvider => {
    if (env.redis.upstashUrl && env.redis.upstashToken) {
        return new UpstashCacheProvider({ url: env.redis.upstashUrl, token: env.redis.upstashToken, keyPrefix: KEY_PREFIX });
    }

    return new RedisCacheProvider({
        host: env.redis.host,
        port: env.redis.port,
        password: env.redis.password,
        keyPrefix: KEY_PREFIX,
    });
};

export const cacheProvider = createCacheProvider();
