import { describe, expect, test } from 'bun:test';
import { IdentityMapContext } from '../../src/identity-map/identity-map-context';
import { IdentityMap } from '../../src/identity-map/identity-map';

describe('IdentityMapContext', () => {
  let context: IdentityMapContext;

  describe('hasContext()', () => {
    test('should return false when no context is active', () => {
      // Given
      context = new IdentityMapContext();

      // When / Then
      expect(context.hasContext()).toBe(false);
    });

    test('should return true inside run callback', async () => {
      // Given
      context = new IdentityMapContext();
      let hasContextInsideRun = false;

      // When
      await context.run(async () => {
        hasContextInsideRun = context.hasContext();
      });

      // Then
      expect(hasContextInsideRun).toBe(true);
    });

    test('should return false after run completes', async () => {
      // Given
      context = new IdentityMapContext();

      // When
      await context.run(async () => {
        // Inside run
      });

      // Then
      expect(context.hasContext()).toBe(false);
    });
  });

  describe('getIdentityMap()', () => {
    test('should return undefined when no context is active', () => {
      // Given
      context = new IdentityMapContext();

      // When
      const identityMap = context.getIdentityMap();

      // Then
      expect(identityMap).toBeUndefined();
    });

    test('should return IdentityMap instance inside run callback', async () => {
      // Given
      context = new IdentityMapContext();
      let identityMapInsideRun: IdentityMap | undefined;

      // When
      await context.run(async () => {
        identityMapInsideRun = context.getIdentityMap();
      });

      // Then
      expect(identityMapInsideRun).toBeInstanceOf(IdentityMap);
    });

    test('should return undefined after run completes', async () => {
      // Given
      context = new IdentityMapContext();

      // When
      await context.run(async () => {
        // Inside run
      });

      // Then
      expect(context.getIdentityMap()).toBeUndefined();
    });

    test('should return same IdentityMap instance within same run context', async () => {
      // Given
      context = new IdentityMapContext();
      let firstMap: IdentityMap | undefined;
      let secondMap: IdentityMap | undefined;

      // When
      await context.run(async () => {
        firstMap = context.getIdentityMap();
        secondMap = context.getIdentityMap();
      });

      // Then
      expect(firstMap).toBe(secondMap);
    });
  });

  describe('run()', () => {
    test('should execute callback and return result', async () => {
      // Given
      context = new IdentityMapContext();
      const expectedResult = 'test-result';

      // When
      const result = await context.run(async () => {
        return expectedResult;
      });

      // Then
      expect(result).toBe(expectedResult);
    });

    test('should execute callback with identity map available', async () => {
      // Given
      context = new IdentityMapContext();
      let mapWasAvailable = false;

      // When
      await context.run(async () => {
        mapWasAvailable = context.getIdentityMap() !== undefined;
      });

      // Then
      expect(mapWasAvailable).toBe(true);
    });

    test('should create new IdentityMap for each run call', async () => {
      // Given
      context = new IdentityMapContext();
      let firstMapInstance: IdentityMap | undefined;
      let secondMapInstance: IdentityMap | undefined;

      // When
      await context.run(async () => {
        firstMapInstance = context.getIdentityMap();
      });

      await context.run(async () => {
        secondMapInstance = context.getIdentityMap();
      });

      // Then
      expect(firstMapInstance).toBeDefined();
      expect(secondMapInstance).toBeDefined();
      expect(firstMapInstance).not.toBe(secondMapInstance);
    });

    test('should handle async operations inside run', async () => {
      // Given
      context = new IdentityMapContext();
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      // When
      const result = await context.run(async () => {
        await delay(10);
        return context.hasContext();
      });

      // Then
      expect(result).toBe(true);
    });

    test('should propagate errors from callback', async () => {
      // Given
      context = new IdentityMapContext();
      const errorMessage = 'Test error';

      // When / Then
      await expect(context.run(async () => {
        throw new Error(errorMessage);
      })).rejects.toThrow(errorMessage);
    });

    test('should clear context even when callback throws', async () => {
      // Given
      context = new IdentityMapContext();

      // When
      try {
        await context.run(async () => {
          throw new Error('Test error');
        });
      } catch (e) {
        // Expected error
      }

      // Then
      expect(context.hasContext()).toBe(false);
    });
  });

  describe('nested contexts', () => {
    test('should support nested run calls', async () => {
      // Given
      context = new IdentityMapContext();
      let outerMap: IdentityMap | undefined;
      let innerMap: IdentityMap | undefined;

      // When
      await context.run(async () => {
        outerMap = context.getIdentityMap();

        await context.run(async () => {
          innerMap = context.getIdentityMap();
        });
      });

      // Then
      expect(outerMap).toBeDefined();
      expect(innerMap).toBeDefined();
      // Inner run should create new context, so maps should be different
      expect(outerMap).not.toBe(innerMap);
    });

    test('should restore outer context after nested run completes', async () => {
      // Given
      context = new IdentityMapContext();
      let outerMap: IdentityMap | undefined;
      let mapAfterNested: IdentityMap | undefined;

      // When
      await context.run(async () => {
        outerMap = context.getIdentityMap();

        await context.run(async () => {
          // Nested context
        });

        mapAfterNested = context.getIdentityMap();
      });

      // Then
      expect(outerMap).toBe(mapAfterNested);
    });
  });

  describe('concurrent contexts', () => {
    test('should isolate identity maps across concurrent run calls', async () => {
      // Given
      context = new IdentityMapContext();
      let map1: IdentityMap | undefined;
      let map2: IdentityMap | undefined;
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      // When
      const [result1, result2] = await Promise.all([
        context.run(async () => {
          await delay(10);
          map1 = context.getIdentityMap();
          return map1;
        }),
        context.run(async () => {
          await delay(10);
          map2 = context.getIdentityMap();
          return map2;
        })
      ]);

      // Then
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result1).not.toBe(result2);
    });
  });
});
