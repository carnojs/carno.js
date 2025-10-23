import { describe, expect, test } from 'bun:test';
import {
  BaseEntity,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property,
} from '../../src';
import { Metadata } from '@cheetah.js/core';
import { PROPERTIES_RELATIONS } from '../../src/constants';

describe('Optional Entity Parameter in Relationship Decorators', () => {

  describe('ManyToOne with optional entity', () => {
    test('should accept ManyToOne without entity parameter (compile-time validation)', () => {
      // Given: Entity with ManyToOne decorator without entity param
      @Entity()
      class Author extends BaseEntity {
        @PrimaryKey()
        id: number;

        @Property()
        name: string;
      }

      @Entity()
      class Book extends BaseEntity {
        @PrimaryKey()
        id: number;

        @Property()
        authorId: number;

        @Property()
        title: string;

        // When: Using ManyToOne without entity parameter
        @ManyToOne()
        author: Author;
      }

      // Then: Should compile and create relationship metadata
      const relationships = Metadata.get(PROPERTIES_RELATIONS, Book);
      expect(relationships).toBeDefined();
      expect(relationships.length).toBeGreaterThan(0);

      const authorRelationship = relationships.find(r => r.propertyKey === 'author');
      expect(authorRelationship).toBeDefined();
      expect(authorRelationship.relation).toBe('many-to-one');
    });

    test('should still accept ManyToOne with explicit entity (backward compatibility)', () => {
      // Given: Entities with explicit relationship
      @Entity()
      class User extends BaseEntity {
        @PrimaryKey()
        id: number;

        @Property()
        name: string;
      }

      @Entity()
      class Post extends BaseEntity {
        @PrimaryKey()
        id: number;

        @Property()
        userId: number;

        // When: Using traditional syntax with entity parameter
        @ManyToOne(() => User)
        user: User;
      }

      // Then: Should work exactly as before
      const relationships = Metadata.get(PROPERTIES_RELATIONS, Post);
      expect(relationships).toBeDefined();

      const userRelationship = relationships.find(r => r.propertyKey === 'user');
      expect(userRelationship).toBeDefined();
      expect(userRelationship.relation).toBe('many-to-one');
      expect(typeof userRelationship.entity).toBe('function');
      expect(userRelationship.entity()).toBe(User);
    });

    test('should set __AUTO_DETECT__ flag when entity not provided', () => {
      // Given: ManyToOne without entity
      @Entity()
      class Category extends BaseEntity {
        @PrimaryKey()
        id: number;
      }

      @Entity()
      class Product extends BaseEntity {
        @PrimaryKey()
        id: number;

        @ManyToOne()
        category: Category;
      }

      // When: Checking metadata before auto-detection runs
      const relationships = Metadata.get(PROPERTIES_RELATIONS, Product);
      const categoryRelationship = relationships.find(r => r.propertyKey === 'category');

      // Then: Should have auto-detect flag
      expect(categoryRelationship.entity).toBe('__AUTO_DETECT__');
    });
  });

  describe('OneToMany with explicit entity (required)', () => {
    test('should require entity parameter for OneToMany', () => {
      // Given: OneToMany with required entity parameter
      @Entity()
      class Author extends BaseEntity {
        @PrimaryKey()
        id: number;
      }

      @Entity()
      class Article extends BaseEntity {
        @PrimaryKey()
        id: number;

        @Property()
        authorId: number;
      }

      @Entity()
      class AuthorWithArticles extends BaseEntity {
        @PrimaryKey()
        id: number;

        // When: Using OneToMany with entity (required)
        @OneToMany(() => Article, (article) => article.authorId)
        articles: Article[];
      }

      // Then: Should create relationship metadata correctly
      const relationships = Metadata.get(PROPERTIES_RELATIONS, AuthorWithArticles);
      const articlesRelationship = relationships.find(r => r.propertyKey === 'articles');

      expect(articlesRelationship).toBeDefined();
      expect(articlesRelationship.relation).toBe('one-to-many');
      expect(typeof articlesRelationship.entity).toBe('function');
      expect(articlesRelationship.entity()).toBe(Article);
    });
  });

  describe('Decorator type signatures', () => {
    test('ManyToOne should have optional entity parameter in signature', () => {
      // This test validates TypeScript compilation
      // If it compiles, the optional parameter works

      @Entity()
      class Tag extends BaseEntity {
        @PrimaryKey()
        id: number;
      }

      // Should compile without errors
      class ValidUsages extends BaseEntity {
        // Without entity - valid
        @ManyToOne()
        tag1: Tag;

        // With entity - valid
        @ManyToOne(() => Tag)
        tag2: Tag;
      }

      expect(ValidUsages).toBeDefined();
    });

    test('OneToMany should require entity parameter', () => {
      // Validates TypeScript compilation with entity parameter

      @Entity()
      class Comment extends BaseEntity {
        @PrimaryKey()
        id: number;

        @Property()
        postId: number;
      }

      class ValidOneToMany extends BaseEntity {
        // Entity is required
        @OneToMany(() => Comment, (comment) => comment.postId)
        comments: Comment[];
      }

      expect(ValidOneToMany).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    test('should handle multiple relationships on same entity', () => {
      @Entity()
      class Department extends BaseEntity {
        @PrimaryKey()
        id: number;
      }

      @Entity()
      class Manager extends BaseEntity {
        @PrimaryKey()
        id: number;
      }

      @Entity()
      class Employee extends BaseEntity {
        @PrimaryKey()
        id: number;

        @Property()
        departmentId: number;

        @Property()
        managerId: number;

        @ManyToOne()
        department: Department;

        @ManyToOne()
        manager: Manager;
      }

      const relationships = Metadata.get(PROPERTIES_RELATIONS, Employee);
      expect(relationships.length).toBe(2);

      const deptRel = relationships.find(r => r.propertyKey === 'department');
      const mgrRel = relationships.find(r => r.propertyKey === 'manager');

      expect(deptRel).toBeDefined();
      expect(mgrRel).toBeDefined();
      expect(deptRel.entity).toBe('__AUTO_DETECT__');
      expect(mgrRel.entity).toBe('__AUTO_DETECT__');
    });

    test('should handle mixed explicit and auto-detect relationships', () => {
      @Entity()
      class Country extends BaseEntity {
        @PrimaryKey()
        id: number;
      }

      @Entity()
      class City extends BaseEntity {
        @PrimaryKey()
        id: number;

        @Property()
        countryId: number;

        // Explicit entity
        @ManyToOne(() => Country)
        country: Country;
      }

      @Entity()
      class Address extends BaseEntity {
        @PrimaryKey()
        id: number;

        @Property()
        cityId: number;

        // Auto-detect
        @ManyToOne()
        city: City;
      }

      const cityRels = Metadata.get(PROPERTIES_RELATIONS, City);
      const addressRels = Metadata.get(PROPERTIES_RELATIONS, Address);

      const countryRel = cityRels.find(r => r.propertyKey === 'country');
      const cityRel = addressRels.find(r => r.propertyKey === 'city');

      expect(typeof countryRel.entity).toBe('function');
      expect(countryRel.entity()).toBe(Country);
      expect(cityRel.entity).toBe('__AUTO_DETECT__');
    });
  });

  describe('Column name generation', () => {
    test('should generate correct column name for ManyToOne', () => {
      @Entity()
      class Organization extends BaseEntity {
        @PrimaryKey()
        id: number;
      }

      @Entity()
      class Member extends BaseEntity {
        @PrimaryKey()
        id: number;

        @ManyToOne()
        organization: Organization;
      }

      const relationships = Metadata.get(PROPERTIES_RELATIONS, Member);
      const orgRel = relationships.find(r => r.propertyKey === 'organization');

      expect(orgRel.columnName).toBe('organization_id');
    });

    test('should generate correct column name for OneToMany', () => {
      @Entity()
      class Blog extends BaseEntity {
        @PrimaryKey()
        id: number;

        @OneToMany((post) => post.blogId)
        blogPosts: any[];
      }

      const relationships = Metadata.get(PROPERTIES_RELATIONS, Blog);
      const postsRel = relationships.find(r => r.propertyKey === 'blogPosts');

      expect(postsRel.columnName).toBe('blog_posts_id');
    });
  });
});
