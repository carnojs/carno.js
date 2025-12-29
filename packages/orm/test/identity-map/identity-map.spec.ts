import { describe, expect, test, beforeEach } from 'bun:test';
import { BaseEntity, Entity, PrimaryKey, Property } from '../../src';
import { IdentityMap } from '../../src/identity-map/identity-map';
import { EntityStorage } from '../../src/domain/entities';

// Initialize EntityStorage before entity decorators run
const entityStorage = new EntityStorage();

@Entity()
class User extends BaseEntity {
  @PrimaryKey()
  id: number;

  @Property()
  email: string;
}

@Entity()
class Product extends BaseEntity {
  @PrimaryKey()
  productId: number;

  @Property()
  name: string;
}

// Register entities in EntityStorage
entityStorage.add(
  { target: User, options: {} },
  {
    id: { options: { isPrimary: true, columnName: 'id' } as any, type: Number },
    email: { options: { columnName: 'email' } as any, type: String }
  },
  [],
  []
);

entityStorage.add(
  { target: Product, options: {} },
  {
    productId: { options: { isPrimary: true, columnName: 'product_id' } as any, type: Number },
    name: { options: { columnName: 'name' } as any, type: String }
  },
  [],
  []
);

describe('IdentityMap', () => {
  let identityMap: IdentityMap;

  beforeEach(() => {
    identityMap = new IdentityMap();
  });

  describe('set() and get()', () => {
    test('should store and retrieve entity', () => {
      // Given
      const user = new User();
      user.id = 1;
      user.email = 'test@test.com';

      // When
      identityMap.set(user);
      const retrieved = identityMap.get(User, 1);

      // Then
      expect(retrieved).toBeDefined();
      expect(retrieved).toBe(user);
      expect(retrieved?.id).toBe(1);
      expect(retrieved?.email).toBe('test@test.com');
    });

    test('should return same instance on multiple gets', () => {
      // Given
      const user = new User();
      user.id = 42;
      user.email = 'multiple@test.com';

      // When
      identityMap.set(user);
      const first = identityMap.get(User, 42);
      const second = identityMap.get(User, 42);

      // Then
      expect(first).toBe(second);
      expect(first).toBe(user);
    });

    test('should return undefined for non-existent entity', () => {
      // When
      const result = identityMap.get(User, 999);

      // Then
      expect(result).toBeUndefined();
    });

    test('should handle multiple entities of same type', () => {
      // Given
      const user1 = new User();
      user1.id = 1;
      user1.email = 'user1@test.com';

      const user2 = new User();
      user2.id = 2;
      user2.email = 'user2@test.com';

      // When
      identityMap.set(user1);
      identityMap.set(user2);

      // Then
      expect(identityMap.get(User, 1)).toBe(user1);
      expect(identityMap.get(User, 2)).toBe(user2);
    });

    test('should handle entities of different types with same ID', () => {
      // Given
      const user = new User();
      user.id = 1;
      user.email = 'user@test.com';

      const product = new Product();
      product.productId = 1;
      product.name = 'Product 1';

      // When
      identityMap.set(user);
      identityMap.set(product);

      // Then
      expect(identityMap.get(User, 1)).toBe(user);
      expect(identityMap.get(Product, 1)).toBe(product);
      expect(identityMap.get(User, 1)).not.toBe(identityMap.get(Product, 1));
    });

    test('should update entity when set with same ID', () => {
      // Given
      const user1 = new User();
      user1.id = 1;
      user1.email = 'original@test.com';

      const user2 = new User();
      user2.id = 1;
      user2.email = 'updated@test.com';

      // When
      identityMap.set(user1);
      identityMap.set(user2);

      // Then
      const retrieved = identityMap.get(User, 1);
      expect(retrieved).toBe(user2);
      expect(retrieved?.email).toBe('updated@test.com');
    });

    test('should handle entities with custom primary key property', () => {
      // Given
      const product = new Product();
      product.productId = 99;
      product.name = 'Custom PK Product';

      // When
      identityMap.set(product);
      const retrieved = identityMap.get(Product, 99);

      // Then
      expect(retrieved).toBe(product);
      expect(retrieved?.name).toBe('Custom PK Product');
    });
  });

  describe('has()', () => {
    test('should return true for existing entity', () => {
      // Given
      const user = new User();
      user.id = 1;
      user.email = 'test@test.com';

      // When
      identityMap.set(user);

      // Then
      expect(identityMap.has(User, 1)).toBe(true);
    });

    test('should return false for non-existent entity', () => {
      // When / Then
      expect(identityMap.has(User, 999)).toBe(false);
    });

    test('should return false after entity is removed', () => {
      // Given
      const user = new User();
      user.id = 1;
      user.email = 'test@test.com';

      // When
      identityMap.set(user);
      identityMap.remove(User, 1);

      // Then
      expect(identityMap.has(User, 1)).toBe(false);
    });

    test('should distinguish between different entity types', () => {
      // Given
      const user = new User();
      user.id = 1;

      // When
      identityMap.set(user);

      // Then
      expect(identityMap.has(User, 1)).toBe(true);
      expect(identityMap.has(Product, 1)).toBe(false);
    });
  });

  describe('remove()', () => {
    test('should remove entity from identity map', () => {
      // Given
      const user = new User();
      user.id = 1;
      user.email = 'test@test.com';
      identityMap.set(user);

      // When
      identityMap.remove(User, 1);

      // Then
      expect(identityMap.get(User, 1)).toBeUndefined();
      expect(identityMap.has(User, 1)).toBe(false);
    });

    test('should not affect other entities when removing one', () => {
      // Given
      const user1 = new User();
      user1.id = 1;
      const user2 = new User();
      user2.id = 2;
      identityMap.set(user1);
      identityMap.set(user2);

      // When
      identityMap.remove(User, 1);

      // Then
      expect(identityMap.get(User, 1)).toBeUndefined();
      expect(identityMap.get(User, 2)).toBe(user2);
    });

    test('should handle removing non-existent entity gracefully', () => {
      // When / Then
      expect(() => identityMap.remove(User, 999)).not.toThrow();
    });
  });

  describe('clear()', () => {
    test('should remove all entities from identity map', () => {
      // Given
      const user1 = new User();
      user1.id = 1;
      const user2 = new User();
      user2.id = 2;
      const product = new Product();
      product.productId = 1;

      identityMap.set(user1);
      identityMap.set(user2);
      identityMap.set(product);

      // When
      identityMap.clear();

      // Then
      expect(identityMap.get(User, 1)).toBeUndefined();
      expect(identityMap.get(User, 2)).toBeUndefined();
      expect(identityMap.get(Product, 1)).toBeUndefined();
      expect(identityMap.has(User, 1)).toBe(false);
      expect(identityMap.has(User, 2)).toBe(false);
      expect(identityMap.has(Product, 1)).toBe(false);
    });

    test('should allow adding entities after clear', () => {
      // Given
      const user1 = new User();
      user1.id = 1;
      identityMap.set(user1);
      identityMap.clear();

      // When
      const user2 = new User();
      user2.id = 2;
      identityMap.set(user2);

      // Then
      expect(identityMap.get(User, 2)).toBe(user2);
    });
  });

  describe('edge cases', () => {
    test('should handle entity with ID zero', () => {
      // Given
      const user = new User();
      user.id = 0;
      user.email = 'zero@test.com';

      // When
      identityMap.set(user);

      // Then
      expect(identityMap.get(User, 0)).toBe(user);
      expect(identityMap.has(User, 0)).toBe(true);
    });

    test('should handle entity without ID set', () => {
      // Given
      const user = new User();
      user.email = 'noid@test.com';

      // When / Then
      // Entity without ID should still be stored (with undefined as key)
      expect(() => identityMap.set(user)).not.toThrow();
    });

    test('should properly update entity state', () => {
      // Given
      const user = new User();
      user.id = 1;
      user.email = 'original@test.com';

      // When
      identityMap.set(user);
      user.email = 'modified@test.com';
      const retrieved = identityMap.get(User, 1);

      // Then
      // Should return same instance, which has been modified
      expect(retrieved).toBe(user);
      expect(retrieved?.email).toBe('modified@test.com');
    });
  });
});
