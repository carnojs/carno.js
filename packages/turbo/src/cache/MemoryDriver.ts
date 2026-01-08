import type { CacheDriver } from './CacheDriver';

interface CacheEntry<T> {
    value: T;
    expiresAt: number | null;
}

/**
 * In-Memory Cache Driver.
 * Ultra-fast, perfect for single-instance applications.
 * 
 * Features:
 * - O(1) get/set/del operations
 * - Lazy expiration (checked on access)
 * - Periodic cleanup of expired entries
 */
export class MemoryDriver implements CacheDriver {
    readonly name = 'MemoryDriver';

    private cache = new Map<string, CacheEntry<any>>();
    private cleanupInterval: Timer | null = null;

    constructor(cleanupIntervalMs: number = 0) {
        // Periodic cleanup of expired entries (disabled by default for performance)
        if (cleanupIntervalMs > 0) {
            this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalMs);
        }
    }

    async get<T>(key: string): Promise<T | null> {
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        // Check expiration
        if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return entry.value;
    }

    async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
        const expiresAt = ttl ? Date.now() + (ttl * 1000) : null;

        this.cache.set(key, { value, expiresAt });

        return true;
    }

    async del(key: string): Promise<boolean> {
        return this.cache.delete(key);
    }

    async has(key: string): Promise<boolean> {
        const entry = this.cache.get(key);

        if (!entry) {
            return false;
        }

        if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return false;
        }

        return true;
    }

    async clear(): Promise<void> {
        this.cache.clear();
    }

    async close(): Promise<void> {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.cache.clear();
    }

    /**
     * Remove expired entries.
     */
    private cleanup(): void {
        const now = Date.now();

        for (const [key, entry] of this.cache) {
            if (entry.expiresAt !== null && now > entry.expiresAt) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Get cache stats (for debugging).
     */
    stats(): { size: number } {
        return { size: this.cache.size };
    }
}
