export interface ICacheProvider {
    connect(): Promise<void>;

    isReady(): boolean;

    get(key: string): Promise<string | null>;

    set(key: string, value: string, ttlSeconds?: number): Promise<void>;

    setIfNotExists(key: string, value: string, ttlSeconds: number): Promise<boolean>;

    del(...keys: string[]): Promise<number>;

    increment(key: string): Promise<number>;

    expire(key: string, ttlSeconds: number): Promise<boolean>;

    ttl(key: string): Promise<number>;

    disconnect(): Promise<void>;
}
