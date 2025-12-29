import { describe, expect, test, beforeEach } from 'bun:test';
import { BaseEntity, Entity, PrimaryKey, Property } from '../../src';
import { EntityKeyGenerator } from '../../src/identity-map/entity-key-generator';
import { EntityStorage } from '../../src/domain/entities';

// Initialize EntityStorage before entity decorators run
const entityStorage = new EntityStorage();

@Entity()
class User extends BaseEntity {
  @PrimaryKey()
  id: number;

  @Property()
  name: string;
}

@Entity()
class Product extends BaseEntity {
  @PrimaryKey()
  productId: number;

  @Property()
  title: string;
}

@Entity()
class Article extends BaseEntity {
  @PrimaryKey()
  uuid: string;

  @Property()
  content: string;
}

// Register entities in EntityStorage
entityStorage.add(
  { target: User, options: {} },
  {
    id: { options: { isPrimary: true, columnName: 'id' } as any, type: Number },
    name: { options: { columnName: 'name' } as any, type: String }
  },
  [],
  []
);

entityStorage.add(
  { target: Product, options: {} },
  {
    productId: { options: { isPrimary: true, columnName: 'product_id' } as any, type: Number },
    title: { options: { columnName: 'title' } as any, type: String }
  },
  [],
  []
);

entityStorage.add(
  { target: Article, options: {} },
  {
    uuid: { options: { isPrimary: true, columnName: 'uuid' } as any, type: String },
    content: { options: { columnName: 'content' } as any, type: String }
  },
  [],
  []
);

describe('EntityKeyGenerator', () => {
  let keyGenerator: EntityKeyGenerator;

  beforeEach(() => {
    keyGenerator = new EntityKeyGenerator();
  });

  describe('generate()', () => {
    test('should generate key with class name and numeric primary key', () => {
      // Given
      const entityClass = User;
      const primaryKey = 123;

      // When
      const key = keyGenerator.generate(entityClass, primaryKey);

      // Then
      expect(key).toBe('User:123');
    });

    test('should generate key with class name and string primary key', () => {
      // Given
      const entityClass = Article;
      const primaryKey = 'abc-123-def';

      // When
      const key = keyGenerator.generate(entityClass, primaryKey);

      // Then
      expect(key).toBe('Article:abc-123-def');
    });

    test('should generate different keys for different entity classes with same ID', () => {
      // Given
      const primaryKey = 1;

      // When
      const userKey = keyGenerator.generate(User, primaryKey);
      const productKey = keyGenerator.generate(Product, primaryKey);

      // Then
      expect(userKey).toBe('User:1');
      expect(productKey).toBe('Product:1');
      expect(userKey).not.toBe(productKey);
    });

    test('should generate different keys for same class with different IDs', () => {
      // Given
      const id1 = 1;
      const id2 = 2;

      // When
      const key1 = keyGenerator.generate(User, id1);
      const key2 = keyGenerator.generate(User, id2);

      // Then
      expect(key1).toBe('User:1');
      expect(key2).toBe('User:2');
      expect(key1).not.toBe(key2);
    });
  });

  describe('generateForEntity()', () => {
    test('should generate key from entity instance with numeric ID', () => {
      // Given
      const user = new User();
      user.id = 456;
      user.name = 'John';

      // When
      const key = keyGenerator.generateForEntity(user);

      // Then
      expect(key).toBe('User:456');
    });

    test('should generate key from entity instance with string ID', () => {
      // Given
      const article = new Article();
      article.uuid = 'xyz-789';
      article.content = 'Test content';

      // When
      const key = keyGenerator.generateForEntity(article);

      // Then
      expect(key).toBe('Article:xyz-789');
    });

    test('should generate key from entity with custom primary key property name', () => {
      // Given
      const product = new Product();
      product.productId = 999;
      product.title = 'Test Product';

      // When
      const key = keyGenerator.generateForEntity(product);

      // Then
      expect(key).toBe('Product:999');
    });
  });

  describe('extractPrimaryKey()', () => {
    test('should extract numeric primary key from entity', () => {
      // Given
      const user = new User();
      user.id = 123;
      user.name = 'Jane';

      // When
      const pk = keyGenerator.extractPrimaryKey(user);

      // Then
      expect(pk).toBe(123);
    });

    test('should extract string primary key from entity', () => {
      // Given
      const article = new Article();
      article.uuid = 'abc-def-ghi';
      article.content = 'Content';

      // When
      const pk = keyGenerator.extractPrimaryKey(article);

      // Then
      expect(pk).toBe('abc-def-ghi');
    });

    test('should extract custom primary key property', () => {
      // Given
      const product = new Product();
      product.productId = 777;
      product.title = 'Product';

      // When
      const pk = keyGenerator.extractPrimaryKey(product);

      // Then
      expect(pk).toBe(777);
    });

    test('should return undefined for entity without primary key set', () => {
      // Given
      const user = new User();
      user.name = 'No ID User';

      // When
      const pk = keyGenerator.extractPrimaryKey(user);

      // Then
      expect(pk).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    test('should handle zero as primary key', () => {
      // Given
      const entityClass = User;
      const primaryKey = 0;

      // When
      const key = keyGenerator.generate(entityClass, primaryKey);

      // Then
      expect(key).toBe('User:0');
    });

    test('should handle empty string as primary key', () => {
      // Given
      const entityClass = Article;
      const primaryKey = '';

      // When
      const key = keyGenerator.generate(entityClass, primaryKey);

      // Then
      expect(key).toBe('Article:');
    });

    test('should handle special characters in string primary key', () => {
      // Given
      const entityClass = Article;
      const primaryKey = 'test@#$%:special';

      // When
      const key = keyGenerator.generate(entityClass, primaryKey);

      // Then
      expect(key).toBe('Article:test@#$%:special');
    });
  });
});
