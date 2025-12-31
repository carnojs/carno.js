import { describe, expect, test } from 'bun:test';
import {
  BaseEntity,
  Entity,
  Enum,
  PrimaryKey,
  Property,
} from '../../src';
import { Metadata } from '@carno.js/core';
import { PROPERTIES_METADATA } from '../../src/constants';

describe('Optional Enum Parameter in Enum Decorator', () => {

  describe('Enum with optional parameter', () => {
    test('should accept Enum without parameter (compile-time validation)', () => {
      // Given: String enum for testing
      enum UserRole {
        ADMIN = 'admin',
        USER = 'user',
        GUEST = 'guest'
      }

      // When: Using Enum without parameter
      @Entity()
      class User extends BaseEntity {
        @PrimaryKey()
        id: number;

        @Property()
        name: string;

        @Enum()
        role: UserRole;
      }

      // Then: Should compile and create property metadata
      const properties = Metadata.get(PROPERTIES_METADATA, User);
      expect(properties).toBeDefined();
      expect(properties['role']).toBeDefined();
      expect(properties['role'].options.isEnum).toBe(true);
    });

    test('should still accept Enum with explicit items (backward compatibility)', () => {
      // Given: Explicit enum values
      enum Status {
        ACTIVE = 'active',
        INACTIVE = 'inactive'
      }

      @Entity()
      class Account extends BaseEntity {
        @PrimaryKey()
        id: number;

        // When: Using traditional syntax with items parameter
        @Enum({ items: Object.values(Status) })
        status: Status;
      }

      // Then: Should work exactly as before
      const properties = Metadata.get(PROPERTIES_METADATA, Account);
      expect(properties).toBeDefined();
      expect(properties['status']).toBeDefined();
      expect(properties['status'].options.isEnum).toBe(true);
      expect(properties['status'].options.enumItems).toEqual(['active', 'inactive']);
    });

    test('should set __AUTO_DETECT__ flag when parameter not provided', () => {
      // Given: Enum without parameter
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

      // When: Checking metadata before auto-detection runs
      const properties = Metadata.get(PROPERTIES_METADATA, Task);
      const priorityProperty = properties['priority'];

      // Then: Should have auto-detect flag
      expect(priorityProperty.options.enumItems).toBe('__AUTO_DETECT__');
    });

    test('should accept Enum with function parameter (backward compatibility)', () => {
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

        // When: Using function syntax
        @Enum(() => Color)
        color: Color;
      }

      // Then: Should work with function parameter
      const properties = Metadata.get(PROPERTIES_METADATA, Product);
      expect(properties).toBeDefined();
      expect(properties['color']).toBeDefined();
      expect(properties['color'].options.isEnum).toBe(true);
    });
  });

  describe('Numeric enums', () => {
    test('should handle numeric enums without parameter', () => {
      // Given: Numeric enum
      enum Level {
        BEGINNER = 1,
        INTERMEDIATE = 2,
        ADVANCED = 3
      }

      @Entity()
      class Course extends BaseEntity {
        @PrimaryKey()
        id: number;

        @Enum()
        level: Level;
      }

      // Then: Should create metadata with auto-detect flag
      const properties = Metadata.get(PROPERTIES_METADATA, Course);
      expect(properties['level'].options.enumItems).toBe('__AUTO_DETECT__');
    });
  });

  describe('String enums', () => {
    test('should handle string enums without parameter', () => {
      // Given: String enum
      enum Gender {
        MALE = 'male',
        FEMALE = 'female',
        OTHER = 'other'
      }

      @Entity()
      class Person extends BaseEntity {
        @PrimaryKey()
        id: number;

        @Enum()
        gender: Gender;
      }

      // Then: Should create metadata with auto-detect flag
      const properties = Metadata.get(PROPERTIES_METADATA, Person);
      expect(properties['gender'].options.enumItems).toBe('__AUTO_DETECT__');
    });
  });

  describe('Array enums', () => {
    test('should handle enum arrays without parameter', () => {
      // Given: Enum array
      enum Tag {
        JAVASCRIPT = 'javascript',
        TYPESCRIPT = 'typescript',
        PYTHON = 'python'
      }

      @Entity()
      class Article extends BaseEntity {
        @PrimaryKey()
        id: number;

        @Enum()
        tags: Tag[];
      }

      // Then: Should create metadata with auto-detect flag
      const properties = Metadata.get(PROPERTIES_METADATA, Article);
      expect(properties['tags'].options.enumItems).toBe('__AUTO_DETECT__');
    });
  });

  describe('Edge cases', () => {
    test('should handle multiple enum properties on same entity', () => {
      enum Status {
        DRAFT = 'draft',
        PUBLISHED = 'published'
      }

      enum Type {
        NEWS = 'news',
        BLOG = 'blog'
      }

      @Entity()
      class Post extends BaseEntity {
        @PrimaryKey()
        id: number;

        @Enum()
        status: Status;

        @Enum()
        type: Type;
      }

      const properties = Metadata.get(PROPERTIES_METADATA, Post);

      expect(properties['status'].options.enumItems).toBe('__AUTO_DETECT__');
      expect(properties['type'].options.enumItems).toBe('__AUTO_DETECT__');
    });

    test('should handle mixed explicit and auto-detect enums', () => {
      enum Size {
        SMALL = 's',
        MEDIUM = 'm',
        LARGE = 'l'
      }

      enum Color {
        RED = 'red',
        BLUE = 'blue'
      }

      @Entity()
      class Item extends BaseEntity {
        @PrimaryKey()
        id: number;

        // Explicit
        @Enum({ items: Object.values(Size) })
        size: Size;

        // Auto-detect
        @Enum()
        color: Color;
      }

      const properties = Metadata.get(PROPERTIES_METADATA, Item);

      expect(properties['size'].options.enumItems).toEqual(['s', 'm', 'l']);
      expect(properties['color'].options.enumItems).toBe('__AUTO_DETECT__');
    });
  });

  describe('Decorator type signatures', () => {
    test('Enum should have optional parameter in signature', () => {
      // This test validates TypeScript compilation
      // If it compiles, the optional parameter works

      enum State {
        ON = 'on',
        OFF = 'off'
      }

      class ValidUsages extends BaseEntity {
        // Without parameter - valid
        @Enum()
        state1: State;

        // With items - valid
        @Enum({ items: ['on', 'off'] })
        state2: State;

        // With function - valid
        @Enum(() => State)
        state3: State;
      }

      expect(ValidUsages).toBeDefined();
    });
  });
});
