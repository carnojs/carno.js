import { describe, expect, test, beforeAll } from 'bun:test';
import {
  BaseEntity,
  Entity,
  Enum,
  PrimaryKey,
  Property,
  OrmService,
  Orm,
  EntityStorage,
} from '../../src';
import { Metadata } from '@cheetah.js/core';
import { PROPERTIES_METADATA } from '../../src/constants';
import { LoggerService } from '@cheetah.js/core';
import * as path from 'path';

describe('Enum Auto-Detection Integration', () => {

  describe('Auto-detection with ts-morph', () => {
    test('should auto-detect string enum from file', async () => {
      // Given: Entity file with enum (will be created as temp file)
      const testFilePath = path.join(__dirname, 'test-entities-enum.ts');

      // Create a test entity file
      const entityCode = `
        import { BaseEntity, Entity, Enum, PrimaryKey } from '../../src';

        export enum UserRole {
          ADMIN = 'admin',
          USER = 'user',
          GUEST = 'guest'
        }

        @Entity()
        export class TestUser extends BaseEntity {
          @PrimaryKey()
          id: number;

          @Enum()
          role: UserRole;
        }
      `;

      await Bun.write(testFilePath, entityCode);

      try {
        // When: Loading the entity
        const { TestUser } = await import(testFilePath);

        // Create ORM service
        const logger = new LoggerService({ applicationConfig: { logger: { level: 'info' } } } as any);
        const orm = new Orm(logger);
        const storage = new EntityStorage();
        const service = new OrmService(orm, storage, testFilePath);

        // Then: Metadata should be populated (before onInit)
        const propertiesBefore = Metadata.get(PROPERTIES_METADATA, TestUser);
        expect(propertiesBefore['role'].options.enumItems).toBe('__AUTO_DETECT__');

        // Clean up
        await Bun.write(testFilePath, ''); // Clear file content
        const fs = await import('fs');
        fs.unlinkSync(testFilePath);
      } catch (error) {
        // Clean up on error
        const fs = await import('fs');
        try {
          fs.unlinkSync(testFilePath);
        } catch {}
        throw error;
      }
    });

    test('should auto-detect numeric enum', () => {
      // Given: Numeric enum
      enum Priority {
        LOW = 1,
        MEDIUM = 2,
        HIGH = 3
      }

      @Entity()
      class Task extends BaseEntity {
        @PrimaryKey()
        id: number;

        @Enum()
        priority: Priority;
      }

      // Then: Should have auto-detect flag set
      const properties = Metadata.get(PROPERTIES_METADATA, Task);
      expect(properties['priority'].options.enumItems).toBe('__AUTO_DETECT__');
      expect(properties['priority'].options.isEnum).toBe(true);
    });

    test('should auto-detect enum array', () => {
      // Given: Enum array
      enum Tag {
        JAVASCRIPT = 'js',
        TYPESCRIPT = 'ts',
        PYTHON = 'py'
      }

      @Entity()
      class Article extends BaseEntity {
        @PrimaryKey()
        id: number;

        @Enum()
        tags: Tag[];
      }

      // Then: Should have auto-detect flag
      const properties = Metadata.get(PROPERTIES_METADATA, Article);
      expect(properties['tags'].options.enumItems).toBe('__AUTO_DETECT__');
    });
  });

  describe('Fallback behavior', () => {
    test('should work with explicit enum values', () => {
      // Given: Explicit enum
      enum Status {
        ACTIVE = 'active',
        INACTIVE = 'inactive'
      }

      @Entity()
      class Account extends BaseEntity {
        @PrimaryKey()
        id: number;

        @Enum({ items: Object.values(Status) })
        status: Status;
      }

      // Then: Should use explicit values
      const properties = Metadata.get(PROPERTIES_METADATA, Account);
      expect(properties['status'].options.enumItems).toEqual(['active', 'inactive']);
    });

    test('should work with enum function', () => {
      // Given: Enum function
      enum Color {
        RED = 'red',
        GREEN = 'green',
        BLUE = 'blue'
      }

      @Entity()
      class Product extends BaseEntity {
        @PrimaryKey()
        id: number;

        @Enum(() => Color)
        color: Color;
      }

      // Then: Should extract enum values from function
      const properties = Metadata.get(PROPERTIES_METADATA, Product);
      expect(properties['color'].options.isEnum).toBe(true);
      expect(Array.isArray(properties['color'].options.enumItems)).toBe(true);
    });
  });

  describe('Mixed enum types', () => {
    test('should handle entity with multiple enum types', () => {
      // Given: Entity with multiple enums
      enum Status {
        DRAFT = 'draft',
        PUBLISHED = 'published'
      }

      enum Visibility {
        PUBLIC = 'public',
        PRIVATE = 'private'
      }

      @Entity()
      class Post extends BaseEntity {
        @PrimaryKey()
        id: number;

        @Enum()
        status: Status;

        @Enum({ items: Object.values(Visibility) })
        visibility: Visibility;
      }

      // Then: Should handle both
      const properties = Metadata.get(PROPERTIES_METADATA, Post);
      expect(properties['status'].options.enumItems).toBe('__AUTO_DETECT__');
      expect(properties['visibility'].options.enumItems).toEqual(['public', 'private']);
    });
  });

  describe('Const enums', () => {
    test('should handle const enums', () => {
      // Given: Const enum
      const enum Direction {
        UP = 'up',
        DOWN = 'down',
        LEFT = 'left',
        RIGHT = 'right'
      }

      @Entity()
      class Movement extends BaseEntity {
        @PrimaryKey()
        id: number;

        @Enum({ items: ['up', 'down', 'left', 'right'] })
        direction: Direction;
      }

      // Then: Should use explicit values (const enums require explicit)
      const properties = Metadata.get(PROPERTIES_METADATA, Movement);
      expect(properties['direction'].options.enumItems).toEqual(['up', 'down', 'left', 'right']);
    });
  });
});
