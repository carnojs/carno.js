import { describe, expect, test, beforeEach } from 'bun:test';
import { BaseEntity, Entity, PrimaryKey, Property } from '../../src';
import { IdentityMapIntegration } from '../../src/identity-map/identity-map-integration';
import { identityMapContext } from '../../src/identity-map/identity-map-context';
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

// Register entity in EntityStorage
entityStorage.add(
  { target: User, options: {} },
  {
    id: { options: { isPrimary: true, columnName: 'id' } as any, type: Number },
    email: { options: { columnName: 'email' } as any, type: String }
  },
  [],
  []
);

describe('IdentityMapIntegration', () => {
  describe('without context', () => {
    test('getEntity should return undefined when no context exists', () => {
      // Given / When
      const result = IdentityMapIntegration.getEntity(User, 1);

      // Then
      expect(result).toBeUndefined();
    });

    test('registerEntity should not throw when no context exists', () => {
      // Given
      const user = new User();
      user.id = 1;
      user.email = 'test@test.com';

      // When / Then
      expect(() => IdentityMapIntegration.registerEntity(user)).not.toThrow();
    });

    test('getOrCreate should create instance when no context exists', () => {
      // Given
      const factory = () => {
        const user = new User();
        user.id = 1;
        user.email = 'factory@test.com';
        return user;
      };

      // When
      const { instance, wasCached } = IdentityMapIntegration.getOrCreate(User, 1, factory);

      // Then
      expect(instance).toBeInstanceOf(User);
      expect(instance.id).toBe(1);
      expect(instance.email).toBe('factory@test.com');
      expect(wasCached).toBe(false);
    });

    test('getOrCreateInstance (deprecated) should return instance directly', () => {
      // Given
      const factory = () => {
        const user = new User();
        user.id = 1;
        user.email = 'factory@test.com';
        return user;
      };

      // When
      const result = IdentityMapIntegration.getOrCreateInstance(User, 1, factory);

      // Then
      expect(result).toBeInstanceOf(User);
      expect(result.id).toBe(1);
    });
  });

  describe('with context', () => {
    test('registerEntity should store entity in identity map', async () => {
      await identityMapContext.run(async () => {
        // Given
        const user = new User();
        user.id = 1;
        user.email = 'test@test.com';

        // When
        IdentityMapIntegration.registerEntity(user);

        // Then
        const retrieved = IdentityMapIntegration.getEntity(User, 1);
        expect(retrieved).toBe(user);
      });
    });

    test('getEntity should return stored entity', async () => {
      await identityMapContext.run(async () => {
        // Given
        const user = new User();
        user.id = 42;
        user.email = 'stored@test.com';
        IdentityMapIntegration.registerEntity(user);

        // When
        const retrieved = IdentityMapIntegration.getEntity(User, 42);

        // Then
        expect(retrieved).toBeDefined();
        expect(retrieved).toBe(user);
        expect(retrieved?.email).toBe('stored@test.com');
      });
    });

    test('getEntity should return undefined for non-existent entity', async () => {
      await identityMapContext.run(async () => {
        // When
        const retrieved = IdentityMapIntegration.getEntity(User, 999);

        // Then
        expect(retrieved).toBeUndefined();
      });
    });

    test('getOrCreate should return cached entity if exists', async () => {
      await identityMapContext.run(async () => {
        // Given
        const existingUser = new User();
        existingUser.id = 1;
        existingUser.email = 'existing@test.com';
        IdentityMapIntegration.registerEntity(existingUser);

        const factory = () => {
          const user = new User();
          user.id = 1;
          user.email = 'factory@test.com';
          return user;
        };

        // When
        const { instance, wasCached } = IdentityMapIntegration.getOrCreate(User, 1, factory);

        // Then
        expect(instance).toBe(existingUser);
        expect(instance.email).toBe('existing@test.com');
        expect(wasCached).toBe(true);
      });
    });

    test('getOrCreate should create new instance if not cached', async () => {
      await identityMapContext.run(async () => {
        // Given
        const factory = () => {
          const user = new User();
          user.id = 1;
          user.email = 'new@test.com';
          return user;
        };

        // When
        const { instance, wasCached } = IdentityMapIntegration.getOrCreate(User, 1, factory);

        // Then
        expect(instance.id).toBe(1);
        expect(instance.email).toBe('new@test.com');
        expect(wasCached).toBe(false);

        // Entity IS automatically registered by getOrCreate
        const retrieved = IdentityMapIntegration.getEntity(User, 1);
        expect(retrieved).toBe(instance);
      });
    });

    test('getOrCreate should call factory only when entity not cached', async () => {
      await identityMapContext.run(async () => {
        // Given
        const existingUser = new User();
        existingUser.id = 1;
        existingUser.email = 'existing@test.com';
        IdentityMapIntegration.registerEntity(existingUser);

        let factoryCalled = false;
        const factory = () => {
          factoryCalled = true;
          const user = new User();
          user.id = 1;
          return user;
        };

        // When
        IdentityMapIntegration.getOrCreate(User, 1, factory);

        // Then
        expect(factoryCalled).toBe(false);
      });
    });

    test('should maintain instance identity across multiple gets', async () => {
      await identityMapContext.run(async () => {
        // Given
        const user = new User();
        user.id = 1;
        user.email = 'identity@test.com';
        IdentityMapIntegration.registerEntity(user);

        // When
        const retrieved1 = IdentityMapIntegration.getEntity(User, 1);
        const retrieved2 = IdentityMapIntegration.getEntity(User, 1);

        // Then
        expect(retrieved1).toBe(retrieved2);
        expect(retrieved1).toBe(user);
      });
    });

    test('should handle entity modifications', async () => {
      await identityMapContext.run(async () => {
        // Given
        const user = new User();
        user.id = 1;
        user.email = 'original@test.com';
        IdentityMapIntegration.registerEntity(user);

        // When
        user.email = 'modified@test.com';
        const retrieved = IdentityMapIntegration.getEntity(User, 1);

        // Then
        expect(retrieved?.email).toBe('modified@test.com');
        expect(retrieved).toBe(user);
      });
    });

    test('should handle multiple different entities', async () => {
      await identityMapContext.run(async () => {
        // Given
        const user1 = new User();
        user1.id = 1;
        user1.email = 'user1@test.com';

        const user2 = new User();
        user2.id = 2;
        user2.email = 'user2@test.com';

        // When
        IdentityMapIntegration.registerEntity(user1);
        IdentityMapIntegration.registerEntity(user2);

        // Then
        expect(IdentityMapIntegration.getEntity(User, 1)).toBe(user1);
        expect(IdentityMapIntegration.getEntity(User, 2)).toBe(user2);
      });
    });
  });

  describe('context isolation', () => {
    test('should isolate entities across different contexts', async () => {
      // Given
      const user1 = new User();
      user1.id = 1;
      user1.email = 'context1@test.com';

      const user2 = new User();
      user2.id = 1;
      user2.email = 'context2@test.com';

      // When
      await identityMapContext.run(async () => {
        IdentityMapIntegration.registerEntity(user1);
        const retrieved = IdentityMapIntegration.getEntity(User, 1);
        expect(retrieved).toBe(user1);
      });

      await identityMapContext.run(async () => {
        IdentityMapIntegration.registerEntity(user2);
        const retrieved = IdentityMapIntegration.getEntity(User, 1);
        expect(retrieved).toBe(user2);
      });

      // Then
      // Outside context, should return undefined
      expect(IdentityMapIntegration.getEntity(User, 1)).toBeUndefined();
    });

    test('should not leak entities between concurrent contexts', async () => {
      // Given
      const user1 = new User();
      user1.id = 1;
      user1.email = 'concurrent1@test.com';

      const user2 = new User();
      user2.id = 1;
      user2.email = 'concurrent2@test.com';

      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      // When
      const [result1, result2] = await Promise.all([
        identityMapContext.run(async () => {
          IdentityMapIntegration.registerEntity(user1);
          await delay(10);
          return IdentityMapIntegration.getEntity(User, 1);
        }),
        identityMapContext.run(async () => {
          IdentityMapIntegration.registerEntity(user2);
          await delay(10);
          return IdentityMapIntegration.getEntity(User, 1);
        })
      ]);

      // Then
      expect(result1).toBe(user1);
      expect(result2).toBe(user2);
      expect(result1).not.toBe(result2);
    });
  });
});
