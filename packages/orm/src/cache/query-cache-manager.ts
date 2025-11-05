import { CacheService } from '@cheetah.js/core';
import { Statement } from '../driver/driver.interface';
import { CacheKeyGenerator } from './cache-key-generator';

export class QueryCacheManager {
  private keyGenerator: CacheKeyGenerator;

  constructor(private cacheService: CacheService) {
    this.keyGenerator = new CacheKeyGenerator();
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
    await this.cacheService.set(key, value, ttl);
  }

  async invalidate<T>(statement: Statement<T>): Promise<void> {
    const prefix = this.generateTablePrefix(statement);
    await this.invalidateByPrefix(prefix);
  }

  private generateKey<T>(statement: Statement<T>): string {
    return `orm:${this.keyGenerator.generate(statement)}`;
  }

  private generateTablePrefix<T>(statement: Statement<T>): string {
    return `orm:${statement.table}`;
  }

  private async invalidateByPrefix(prefix: string): Promise<void> {
    await this.cacheService.del(prefix);
  }
}
