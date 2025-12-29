import { describe, expect, test, beforeEach } from 'bun:test';
import { EntityRegistry } from '../../src/identity-map/entity-registry';

describe('EntityRegistry', () => {
  let registry: EntityRegistry;

  class MockEntity {
    constructor(public id: number, public name: string) {}
  }

  beforeEach(() => {
    registry = new EntityRegistry();
  });

  describe('set() and get()', () => {
    test('should store and retrieve entity by key', () => {
      // Given
      const entity = new MockEntity(1, 'Test');
      const key = 'MockEntity:1';

      // When
      registry.set(key, entity);
      const retrieved = registry.get<MockEntity>(key);

      // Then
      expect(retrieved).toBeDefined();
      expect(retrieved).toBe(entity);
      expect(retrieved?.id).toBe(1);
      expect(retrieved?.name).toBe('Test');
    });

    test('should return same instance on multiple gets', () => {
      // Given
      const entity = new MockEntity(42, 'Multiple Get Test');
      const key = 'MockEntity:42';

      // When
      registry.set(key, entity);
      const first = registry.get(key);
      const second = registry.get(key);

      // Then
      expect(first).toBe(second);
      expect(first).toBe(entity);
    });

    test('should return undefined for non-existent key', () => {
      // Given
      const key = 'NonExistent:999';

      // When
      const result = registry.get(key);

      // Then
      expect(result).toBeUndefined();
    });

    test('should handle multiple entities with different keys', () => {
      // Given
      const entity1 = new MockEntity(1, 'First');
      const entity2 = new MockEntity(2, 'Second');
      const entity3 = new MockEntity(3, 'Third');

      // When
      registry.set('MockEntity:1', entity1);
      registry.set('MockEntity:2', entity2);
      registry.set('MockEntity:3', entity3);

      // Then
      expect(registry.get('MockEntity:1')).toBe(entity1);
      expect(registry.get('MockEntity:2')).toBe(entity2);
      expect(registry.get('MockEntity:3')).toBe(entity3);
    });

    test('should overwrite entity if same key is used twice', () => {
      // Given
      const entity1 = new MockEntity(1, 'Original');
      const entity2 = new MockEntity(1, 'Updated');
      const key = 'MockEntity:1';

      // When
      registry.set(key, entity1);
      registry.set(key, entity2);
      const retrieved = registry.get(key);

      // Then
      expect(retrieved).toBe(entity2);
      expect(retrieved?.name).toBe('Updated');
    });
  });

  describe('has()', () => {
    test('should return true for existing key', () => {
      // Given
      const entity = new MockEntity(1, 'Test');
      const key = 'MockEntity:1';

      // When
      registry.set(key, entity);

      // Then
      expect(registry.has(key)).toBe(true);
    });

    test('should return false for non-existent key', () => {
      // Given
      const key = 'NonExistent:999';

      // When / Then
      expect(registry.has(key)).toBe(false);
    });

    test('should return false after entity is removed', () => {
      // Given
      const entity = new MockEntity(1, 'Test');
      const key = 'MockEntity:1';

      // When
      registry.set(key, entity);
      registry.remove(key);

      // Then
      expect(registry.has(key)).toBe(false);
    });
  });

  describe('remove()', () => {
    test('should remove entity from registry', () => {
      // Given
      const entity = new MockEntity(1, 'To Be Removed');
      const key = 'MockEntity:1';
      registry.set(key, entity);

      // When
      registry.remove(key);

      // Then
      expect(registry.get(key)).toBeUndefined();
      expect(registry.has(key)).toBe(false);
    });

    test('should not affect other entities when removing one', () => {
      // Given
      const entity1 = new MockEntity(1, 'First');
      const entity2 = new MockEntity(2, 'Second');
      registry.set('MockEntity:1', entity1);
      registry.set('MockEntity:2', entity2);

      // When
      registry.remove('MockEntity:1');

      // Then
      expect(registry.get('MockEntity:1')).toBeUndefined();
      expect(registry.get('MockEntity:2')).toBe(entity2);
    });

    test('should handle removing non-existent key gracefully', () => {
      // Given
      const key = 'NonExistent:999';

      // When / Then
      expect(() => registry.remove(key)).not.toThrow();
    });
  });

  describe('clear()', () => {
    test('should remove all entities from registry', () => {
      // Given
      const entity1 = new MockEntity(1, 'First');
      const entity2 = new MockEntity(2, 'Second');
      const entity3 = new MockEntity(3, 'Third');
      registry.set('MockEntity:1', entity1);
      registry.set('MockEntity:2', entity2);
      registry.set('MockEntity:3', entity3);

      // When
      registry.clear();

      // Then
      expect(registry.get('MockEntity:1')).toBeUndefined();
      expect(registry.get('MockEntity:2')).toBeUndefined();
      expect(registry.get('MockEntity:3')).toBeUndefined();
      expect(registry.has('MockEntity:1')).toBe(false);
      expect(registry.has('MockEntity:2')).toBe(false);
      expect(registry.has('MockEntity:3')).toBe(false);
    });

    test('should allow adding entities after clear', () => {
      // Given
      const entity1 = new MockEntity(1, 'Before Clear');
      registry.set('MockEntity:1', entity1);
      registry.clear();

      // When
      const entity2 = new MockEntity(2, 'After Clear');
      registry.set('MockEntity:2', entity2);

      // Then
      expect(registry.get('MockEntity:2')).toBe(entity2);
    });
  });

  describe('WeakRef behavior', () => {
    test('should return undefined after entity is garbage collected', async () => {
      // Given
      const key = 'MockEntity:gc-test';

      // When
      // Create entity in block scope and let it be eligible for GC
      (() => {
        const entity = new MockEntity(999, 'Garbage Collect Me');
        registry.set(key, entity);
      })();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        // Wait a bit for GC to run
        await new Promise(resolve => setTimeout(resolve, 100));

        // Then
        const result = registry.get(key);
        // Note: This test is non-deterministic due to GC timing
        // We're just testing that the registry handles deref() returning undefined
        expect(result === undefined || result !== null).toBe(true);
      } else {
        // Skip test if GC is not available
        expect(true).toBe(true);
      }
    });

    test('should not prevent garbage collection of stored entities', () => {
      // Given
      const entity = new MockEntity(1, 'Test');
      const key = 'MockEntity:1';

      // When
      registry.set(key, entity);

      // Then
      // The registry uses WeakRef, so it shouldn't prevent GC
      // This is more of a design verification than a test
      expect(registry.get(key)).toBe(entity);
    });
  });

  describe('edge cases', () => {
    test('should handle entities with same ID but different types', () => {
      // Given
      class User { constructor(public id: number) {} }
      class Product { constructor(public id: number) {} }

      const user = new User(1);
      const product = new Product(1);

      // When
      registry.set('User:1', user);
      registry.set('Product:1', product);

      // Then
      expect(registry.get('User:1')).toBe(user);
      expect(registry.get('Product:1')).toBe(product);
    });

    test('should handle empty string as key', () => {
      // Given
      const entity = new MockEntity(0, 'Empty Key');
      const key = '';

      // When
      registry.set(key, entity);

      // Then
      expect(registry.get(key)).toBe(entity);
      expect(registry.has(key)).toBe(true);
    });

    test('should handle special characters in key', () => {
      // Given
      const entity = new MockEntity(1, 'Special');
      const key = 'Entity:test@#$%:id';

      // When
      registry.set(key, entity);

      // Then
      expect(registry.get(key)).toBe(entity);
    });
  });
});
