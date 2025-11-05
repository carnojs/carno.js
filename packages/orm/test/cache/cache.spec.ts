import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { app, execute, purgeDatabase, startDatabase } from '../node-database';
import {
  BaseEntity,
  Entity,
  PrimaryKey,
  Property,
  Repository,
} from '../../src';

describe('ORM Cache System', () => {
  const DDL_PRODUCT = `
    CREATE TABLE "product" (
      "id" SERIAL PRIMARY KEY,
      "name" varchar(255) NOT NULL,
      "price" decimal(10, 2) NOT NULL,
      "is_available" boolean DEFAULT true,
      "created_at" timestamp DEFAULT NOW()
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

    @Property()
    isAvailable: boolean;

    @Property()
    createdAt: Date;
  }

  class ProductRepository extends Repository<Product> {
    constructor() {
      super(Product);
    }
  }

  let productRepo: ProductRepository;
  let queryExecutionCount: number;

  beforeEach(async () => {
    console.log('Preparing cache tests...');
    await startDatabase();
    await execute(DDL_PRODUCT);
    productRepo = new ProductRepository();
    queryExecutionCount = 0;
    console.log('Cache tests prepared!');
  });

  afterEach(async () => {
    await purgeDatabase();
    await app?.disconnect();
  });

  describe('Cache with TTL (cache: number)', () => {
    test('should cache query result with TTL', async () => {
      // Given
      const product = await productRepo.create({
        name: 'Laptop',
        price: 1000,
        isAvailable: true,
      });

      // When - First call (should hit database)
      const firstCall = await productRepo.find({
        where: { name: 'Laptop' },
        cache: 5000, // 5 seconds TTL
      });

      // When - Second call (should return from cache)
      const secondCall = await productRepo.find({
        where: { name: 'Laptop' },
        cache: 5000,
      });

      // Then
      expect(firstCall).toBeDefined();
      expect(firstCall.length).toBe(1);
      expect(firstCall[0].name).toBe('Laptop');
      expect(secondCall).toBeDefined();
      expect(secondCall.length).toBe(1);
      expect(secondCall[0].id).toBe(product.id);
    });

    test('should expire cache after TTL', async () => {
      // Given
      await productRepo.create({
        name: 'Mouse',
        price: 50,
      });

      // When - First call with 100ms TTL
      const firstCall = await productRepo.find({
        where: { name: 'Mouse' },
        cache: 100,
      });

      // Wait for cache to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // When - Second call after TTL
      const secondCall = await productRepo.find({
        where: { name: 'Mouse' },
        cache: 100,
      });

      // Then - Both calls should return same data
      expect(firstCall.length).toBe(1);
      expect(secondCall.length).toBe(1);
      expect(firstCall[0].name).toBe('Mouse');
      expect(secondCall[0].name).toBe('Mouse');
    });

    test('should cache findOne with TTL', async () => {
      // Given
      const product = await productRepo.create({
        name: 'Keyboard',
        price: 100,
      });

      // When - First call
      const firstCall = await productRepo.findOne({
        where: { id: product.id },
        cache: 5000,
      });

      // When - Second call (cached)
      const secondCall = await productRepo.findOne({
        where: { id: product.id },
        cache: 5000,
      });

      // Then
      expect(firstCall).toBeDefined();
      expect(firstCall!.name).toBe('Keyboard');
      expect(secondCall).toBeDefined();
      expect(secondCall!.id).toBe(product.id);
    });

    test('should cache findById with TTL', async () => {
      // Given
      const product = await productRepo.create({
        name: 'Monitor',
        price: 300,
      });

      // When - First call
      const firstCall = await productRepo.findById(product.id, {
        cache: 5000,
      });

      // When - Second call (cached)
      const secondCall = await productRepo.findById(product.id, {
        cache: 5000,
      });

      // Then
      expect(firstCall).toBeDefined();
      expect(firstCall!.name).toBe('Monitor');
      expect(secondCall).toBeDefined();
      expect(secondCall!.id).toBe(product.id);
    });

    test('should respect different cache keys for different queries', async () => {
      // Given
      await productRepo.create({ name: 'Product A', price: 100 });
      await productRepo.create({ name: 'Product B', price: 200 });

      // When - Two different queries
      const resultA = await productRepo.find({
        where: { name: 'Product A' },
        cache: 5000,
      });

      const resultB = await productRepo.find({
        where: { name: 'Product B' },
        cache: 5000,
      });

      // Then - Each should have its own cached result
      expect(resultA.length).toBe(1);
      expect(resultA[0].name).toBe('Product A');
      expect(resultB.length).toBe(1);
      expect(resultB[0].name).toBe('Product B');
    });
  });

  describe('Cache infinite (cache: true)', () => {
    test('should cache query result infinitely', async () => {
      // Given
      const product = await productRepo.create({
        name: 'Tablet',
        price: 500,
      });

      // When - First call
      const firstCall = await productRepo.find({
        where: { name: 'Tablet' },
        cache: true, // Infinite cache
      });

      // Wait some time
      await new Promise((resolve) => setTimeout(resolve, 100));

      // When - Second call (should still be cached)
      const secondCall = await productRepo.find({
        where: { name: 'Tablet' },
        cache: true,
      });

      // Then
      expect(firstCall.length).toBe(1);
      expect(firstCall[0].name).toBe('Tablet');
      expect(secondCall.length).toBe(1);
      expect(secondCall[0].id).toBe(product.id);
    });

    test('should cache findOne infinitely', async () => {
      // Given
      const product = await productRepo.create({
        name: 'Phone',
        price: 800,
      });

      // When
      const firstCall = await productRepo.findOne({
        where: { id: product.id },
        cache: true,
      });

      const secondCall = await productRepo.findOne({
        where: { id: product.id },
        cache: true,
      });

      // Then
      expect(firstCall).toBeDefined();
      expect(firstCall!.name).toBe('Phone');
      expect(secondCall).toBeDefined();
      expect(secondCall!.id).toBe(product.id);
    });

    test('should cache findById infinitely', async () => {
      // Given
      const product = await productRepo.create({
        name: 'Headphones',
        price: 150,
      });

      // When
      const firstCall = await productRepo.findById(product.id, {
        cache: true,
      });

      const secondCall = await productRepo.findById(product.id, {
        cache: true,
      });

      // Then
      expect(firstCall).toBeDefined();
      expect(firstCall!.name).toBe('Headphones');
      expect(secondCall).toBeDefined();
      expect(secondCall!.id).toBe(product.id);
    });
  });

  describe('Cache invalidation', () => {
    test('should invalidate cache on create', async () => {
      // Given - First query to cache empty result
      const firstQuery = await productRepo.find({
        where: { isAvailable: true },
        cache: 5000,
      });

      expect(firstQuery.length).toBe(0);

      // When - Create new product
      await productRepo.create({
        name: 'New Product',
        price: 250,
        isAvailable: true,
      });

      // Then - Query should return new product (cache invalidated)
      const secondQuery = await productRepo.find({
        where: { isAvailable: true },
        cache: 5000,
      });

      expect(secondQuery.length).toBe(1);
      expect(secondQuery[0].name).toBe('New Product');
    });

    test('should invalidate cache on update', async () => {
      // Given
      const product = await productRepo.create({
        name: 'Original Name',
        price: 100,
      });

      // Cache the query
      const firstQuery = await productRepo.findById(product.id, {
        cache: 5000,
      });

      expect(firstQuery!.name).toBe('Original Name');

      // When - Update product
      await productRepo.updateById(product.id, {
        name: 'Updated Name',
      });

      // Then - Query should return updated product
      const secondQuery = await productRepo.findById(product.id, {
        cache: 5000,
      });

      expect(secondQuery).toBeDefined();
      expect(secondQuery!.name).toBe('Updated Name');
    });

    test('should invalidate cache on delete', async () => {
      // Given
      const product = await productRepo.create({
        name: 'To Delete',
        price: 75,
      });

      // Cache the query
      const firstQuery = await productRepo.findById(product.id, {
        cache: 5000,
      });

      expect(firstQuery).toBeDefined();

      // When - Delete product
      await productRepo.deleteById(product.id);

      // Then - Query should return undefined
      const secondQuery = await productRepo.findById(product.id, {
        cache: 5000,
      });

      expect(secondQuery).toBeUndefined();
    });
  });

  describe('Cache with complex queries', () => {
    test('should cache queries with orderBy', async () => {
      // Given
      await productRepo.create({ name: 'Z Product', price: 100 });
      await productRepo.create({ name: 'A Product', price: 200 });

      // When
      const firstCall = await productRepo.find({
        orderBy: { name: 'ASC' },
        cache: 5000,
      });

      const secondCall = await productRepo.find({
        orderBy: { name: 'ASC' },
        cache: 5000,
      });

      // Then
      expect(firstCall[0].name).toBe('A Product');
      expect(secondCall[0].name).toBe('A Product');
    });

    test('should cache queries with limit and offset', async () => {
      // Given
      for (let i = 1; i <= 5; i++) {
        await productRepo.create({
          name: `Product ${i}`,
          price: i * 100,
        });
      }

      // When
      const firstCall = await productRepo.find({
        limit: 2,
        offset: 1,
        orderBy: { id: 'ASC' },
        cache: 5000,
      });

      const secondCall = await productRepo.find({
        limit: 2,
        offset: 1,
        orderBy: { id: 'ASC' },
        cache: 5000,
      });

      // Then
      expect(firstCall.length).toBe(2);
      expect(secondCall.length).toBe(2);
      expect(firstCall[0].id).toBe(secondCall[0].id);
    });

    test('should respect different cache keys for different limits', async () => {
      // Given
      await productRepo.create({ name: 'P1', price: 100 });
      await productRepo.create({ name: 'P2', price: 200 });
      await productRepo.create({ name: 'P3', price: 300 });

      // When
      const limit2 = await productRepo.find({
        limit: 2,
        cache: 5000,
      });

      const limit3 = await productRepo.find({
        limit: 3,
        cache: 5000,
      });

      // Then
      expect(limit2.length).toBe(2);
      expect(limit3.length).toBe(3);
    });
  });

  describe('Cache disabled (no cache option)', () => {
    test('should not cache when cache option is not provided', async () => {
      // Given
      const product = await productRepo.create({
        name: 'No Cache',
        price: 100,
      });

      // When - Without cache option
      const firstCall = await productRepo.find({
        where: { name: 'No Cache' },
      });

      // Update between calls
      await productRepo.updateById(product.id, {
        name: 'Updated Without Cache',
      });

      const secondCall = await productRepo.find({
        where: { name: 'Updated Without Cache' },
      });

      // Then - Should reflect changes immediately
      expect(firstCall[0].name).toBe('No Cache');
      expect(secondCall[0].name).toBe('Updated Without Cache');
    });
  });
});
