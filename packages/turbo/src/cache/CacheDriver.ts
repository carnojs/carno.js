/**
 * Cache Driver Interface.
 * Implement this to add new cache backends (Redis, Memcached, etc.)
 */
export interface CacheDriver {
    /**
     * Driver name for debugging.
     */
    readonly name: string;

    /**
     * Get a value from cache.
     */
    get<T>(key: string): Promise<T | null>;

    /**
     * Set a value in cache.
     * @param ttl Time to live in seconds (optional)
     */
    set<T>(key: string, value: T, ttl?: number): Promise<boolean>;

    /**
     * Delete a value from cache.
     */
    del(key: string): Promise<boolean>;

    /**
     * Check if key exists.
     */
    has(key: string): Promise<boolean>;

    /**
     * Clear all cached values.
     */
    clear(): Promise<void>;

    /**
     * Close connection (for Redis, etc.)
     */
    close?(): Promise<void>;
}

/**
 * Cache configuration.
 */
export interface CacheConfig {
    driver?: CacheDriver;
    prefix?: string;
    defaultTtl?: number;
}
