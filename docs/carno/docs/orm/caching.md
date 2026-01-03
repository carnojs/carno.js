# Caching

Carno ORM provides a built-in mechanism to cache query results, which can significantly improve performance for read-heavy applications. The caching system is built on top of the `@carno.js/core` CacheService and supports various caching strategies.

## Configuration

To use caching in the ORM, enable it in your connection settings. The ORM automatically utilizes the registered `CacheService`.

```typescript
import { Carno } from '@carno.js/core';
import { CarnoOrm, Orm, BunPgDriver } from '@carno.js/orm';

const app = new Carno()
  .use(CarnoOrm);
```

## Usage

You can enable caching for specific queries using Repositories, Active Record methods, or the Query Builder.

### Using Repository / Active Record

The `find`, `findOne`, `findAll`, and `findOneOrFail` methods accept a `cache` option.

```typescript
// Cache for 1 minute (60000 ms)
const users = await UserRepository.find({
  where: { isActive: true },
  cache: 60000
});

// Cache forever (or until evicted)
const settings = await Settings.findOne({
  where: { key: 'site_title' },
  cache: true
});

// Cache until a specific date
const promo = await Promotion.findOne({
  where: { code: 'SUMMER2024' },
  cache: new Date('2024-09-01')
});
```

### Using Query Builder

You can also use the `.cache()` method on the Query Builder.

```typescript
const topProducts = await Product.createQueryBuilder()
  .where({ rating: { $gt: 4.5 } })
  .orderBy({ sales: 'DESC' })
  .limit(10)
  .cache(30000) // Cache for 30 seconds
  .executeAndReturnAll();
```

## Cache Options

The `cache` option accepts the following values:

- **`number`**: The Time To Live (TTL) in milliseconds. The result will be cached for this duration.
- **`true`**: The result will be cached indefinitely (or until the cache driver evicts it).
- **`Date`**: The result will be cached until the specified date.
- **`undefined` / `false`**: Caching is disabled for this query (default).

## How it Works

When caching is enabled for a query:
1. The ORM generates a unique cache key based on the query SQL and parameters.
2. It checks if the result exists in the cache.
3. If found, the cached result is returned immediately, bypassing the database.
4. If not found, the query is executed against the database.
5. The result is stored in the cache with the specified TTL.

> **Note**: Currently, the ORM caches are namespaced by table, but automatic invalidation on write operations is not enabled by default. You should use caching primarily for data that doesn't change frequently or where eventual consistency is acceptable.
