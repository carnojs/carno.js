---
sidebar_position: 7
---

# Caching

Cheetah.js provides a unified caching interface via `CacheService`.

## Usage

Inject `CacheService` to interact with the cache.

```ts
import { Service, CacheService } from '@cheetah.js/core';

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

The default driver stores data in memory (LRU with 10,000 items). To use Redis or another store, implement your own `CacheService`.

```ts
import { Service, CacheService } from '@cheetah.js/core';

@Service({ provide: CacheService })
export class RedisCacheService implements CacheService {
  // Implement methods: get, set, del, has, clear, getOrSet
}

new Cheetah({
  providers: [RedisCacheService] // This overrides the default CacheService
}).listen();
```