import { CacheService } from '@carno.js/core';
import { Statement } from '../driver/driver.interface';
import { CacheKeyGenerator } from './cache-key-generator';

const DEFAULT_MAX_KEYS_PER_NAMESPACE = 1000;

export class QueryCacheManager {
  private keyGenerator: CacheKeyGenerator;
  private namespaceKeys: Map<string, Set<string>> = new Map();
  private readonly maxKeysPerNamespace: number;

  constructor(
    private cacheService: CacheService,
    maxKeysPerNamespace: number = DEFAULT_MAX_KEYS_PER_NAMESPACE,
  ) {
    this.keyGenerator = new CacheKeyGenerator();
    this.maxKeysPerNamespace = maxKeysPerNamespace;
  }

  async get<T>(statement: Statement<T>): Promise<any> {
    const key = this.generateKey(statement);
    return this.cacheService.get(key);
  }

  async set<T>(
    statement: Statement<T>,
    value: any,
    ttl?: number
  ): Promise<void> {
    const key = this.generateKey(statement);
    const namespace = this.getNamespace(statement);
    
    this.registerKeyInNamespace(namespace, key);
    await this.cacheService.set(key, value, ttl);
  }

  async invalidate<T>(statement: Statement<T>): Promise<void> {
    const namespace = this.getNamespace(statement);
    const keys = this.namespaceKeys.get(namespace);

    if (!keys || keys.size === 0) {
      return;
    }

    const deletePromises = Array.from(keys).map(key => 
      this.cacheService.del(key)
    );

    await Promise.all(deletePromises);
    this.namespaceKeys.delete(namespace);
  }

  private registerKeyInNamespace(namespace: string, key: string): void {
    if (!this.namespaceKeys.has(namespace)) {
      this.namespaceKeys.set(namespace, new Set());
    }

    const keys = this.namespaceKeys.get(namespace)!;

    if (keys.has(key)) {
      return;
    }

    if (keys.size >= this.maxKeysPerNamespace) {
      this.evictOldestKey(keys);
    }

    keys.add(key);
  }

  private evictOldestKey(keys: Set<string>): void {
    const oldest = keys.values().next().value;
    keys.delete(oldest);
    this.cacheService.del(oldest);
  }

  private getNamespace<T>(statement: Statement<T>): string {
    return statement.table || 'unknown';
  }

  private generateKey<T>(statement: Statement<T>): string {
    return `orm:${this.keyGenerator.generate(statement)}`;
  }
}
