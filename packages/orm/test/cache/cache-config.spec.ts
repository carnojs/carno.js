import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { app, cacheService, execute, mockLogger, purgeDatabase, startDatabase } from '../node-database';
import {
    BaseEntity,
    Entity,
    Orm,
    PrimaryKey,
    Property,
    Repository,
} from '../../src';

describe('ORM Cache Configuration', () => {
    const DDL_PRODUCT = `
    CREATE TABLE "product" (
      "id" SERIAL PRIMARY KEY,
      "name" varchar(255) NOT NULL,
      "price" decimal(10, 2) NOT NULL
    );
  `;

    @Entity()
    class Product extends BaseEntity {
        @PrimaryKey()
        id: number;

        @Property()
        name: string;

        @Property()
        price: number;
    }

    class ProductRepository extends Repository<Product> {
        constructor() {
            super(Product);
        }
    }

    let productRepo: ProductRepository;
    let initialCallCount: number;

    const resetQueryCounter = () => {
        initialCallCount = mockLogger.mock.calls.length;
    };

    const getQueryCount = () => {
        return mockLogger.mock.calls.length - initialCallCount;
    };

    beforeEach(async () => {
        await cacheService.clear();
        await startDatabase();
        await execute(DDL_PRODUCT);
        productRepo = new ProductRepository();
        resetQueryCounter();
    });

    afterEach(async () => {
        await purgeDatabase();
        await app?.disconnect();
    });

    describe('invalidateCacheOnWrite', () => {
        test('should NOT invalidate cache when invalidateCacheOnWrite is false', async () => {
            // Given - Configure ORM to NOT invalidate on write
            Orm.getInstance().connection.cache = {
                invalidateCacheOnWrite: false
            };

            resetQueryCounter();
            const firstQuery = await productRepo.find({
                where: { name: 'Something' },
                cache: 5000,
            });

            expect(firstQuery.length).toBe(0);
            const queriesAfterFirst = getQueryCount();

            // When - Create new product
            await productRepo.create({
                name: 'Something',
                price: 100,
            });

            resetQueryCounter();

            // Then - Should return cached result (stale data) because invalidation is disabled
            const secondQuery = await productRepo.find({
                where: { name: 'Something' },
                cache: 5000,
            });

            const queriesAfterSecond = getQueryCount();

            expect(secondQuery.length).toBe(0); // Stale data
            expect(queriesAfterFirst).toBe(1);
            expect(queriesAfterSecond).toBe(0); // Cache hit
        });

        test('should invalidate cache when invalidateCacheOnWrite is true (default)', async () => {
            // Given - Configure ORM to invalidate on write (default behavior)
            Orm.getInstance().connection.cache = {
                invalidateCacheOnWrite: true
            };

            resetQueryCounter();
            const firstQuery = await productRepo.find({
                where: { name: 'Anything' },
                cache: 5000,
            });

            expect(firstQuery.length).toBe(0);
            const queriesAfterFirst = getQueryCount();

            // When - Create new product
            await productRepo.create({
                name: 'Anything',
                price: 200,
            });

            resetQueryCounter();

            // Then - Should return fresh result
            const secondQuery = await productRepo.find({
                where: { name: 'Anything' },
                cache: 5000,
            });

            const queriesAfterSecond = getQueryCount();

            expect(secondQuery.length).toBe(1); // Fresh data
            expect(queriesAfterFirst).toBe(1);
            expect(queriesAfterSecond).toBe(1); // Database hit
        });
    });

    describe('cache: false (Bypass)', () => {
        test('should bypass cache when cache is false', async () => {
            // Given
            await productRepo.create({ name: 'Bypass', price: 300 });

            // Cache a query first
            await productRepo.find({
                where: { name: 'Bypass' },
                cache: 5000
            });

            resetQueryCounter();

            // When - Query with cache: false
            const result = await productRepo.find({
                where: { name: 'Bypass' },
                cache: false
            });

            const queriesAfter = getQueryCount();

            // Then
            expect(result.length).toBe(1);
            expect(queriesAfter).toBe(1); // Should hit database even if cached previously
        });
    });
});
