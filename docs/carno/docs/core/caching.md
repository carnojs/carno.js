---
sidebar_position: 7
---

# Caching

Carno.js provides a unified caching interface via `CacheService`.

## Usage

Inject `CacheService` to interact with the cache.

```ts
import { Service, CacheService } from '@carno.js/core';

@Service()
export class ProductService {
  constructor(private cache: CacheService) {}

  async getProduct(id: string) {
    // Try to get from cache
    const cached = await this.cache.get(`product:${id}`);
    if (cached) return cached;

    // Fetch from DB...
    const product = { id, name: 'Phone' };

    // Set in cache for 1 hour
    await this.cache.set(`product:${id}`, product, '1h');

    return product;
  }
}
```

## Atomic Get or Set

Use `getOrSet` to handle the check-then-fetch pattern atomically.

```ts
async getProduct(id: string) {
  return this.cache.getOrSet(
    `product:${id}`,
    async () => {
      // Logic to fetch data if cache miss
      return db.findProduct(id);
    },
    '30m' // TTL
  );
}
```

## Custom Cache Driver

The default driver stores data in memory (LRU with 10,000 items). To use Redis or another store, implement a `CacheDriver` and register a `CacheService` instance via `app.services()`.

```ts
import { Carno, CacheService, type CacheDriver } from '@carno.js/core';

class RedisDriver implements CacheDriver {
  name = 'redis';

  async get<T>(key: string) { /* ... */ }
  async set<T>(key: string, value: T, ttl?: number) { /* ... */ }
  async del(key: string) { /* ... */ }
  async has(key: string) { /* ... */ }
  async clear() { /* ... */ }
  async close() { /* ... */ }
}

const app = new Carno()
  .services([
    { token: CacheService, useValue: new CacheService({ driver: new RedisDriver() }) }
  ]);

app.listen(3000);
```
