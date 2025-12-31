import { afterEach, beforeEach, describe, expect, it, jest } from 'bun:test';
import { app, execute, mockLogger, purgeDatabase, startDatabase } from '../node-database';
import { BaseEntity, Computed, Entity, PrimaryKey, Property } from '../../src';
import { Metadata } from '@carno.js/core';
import { COMPUTED_PROPERTIES } from '../../src/constants';

describe('@Computed Decorator', () => {
  describe('Unit Tests - Metadata', () => {
    it('should store computed property in metadata', () => {
      @Entity()
      class TestEntity extends BaseEntity {
        @PrimaryKey()
        id: number;

        @Property()
        name: string;

        @Computed()
        get displayName() {
          return `Name: ${this.name}`;
        }
      }

      const computedProperties = Metadata.get(COMPUTED_PROPERTIES, TestEntity);

      expect(computedProperties).toBeDefined();
      expect(computedProperties).toContain('displayName');
      expect(computedProperties.length).toBe(1);
    });

    it('should store multiple computed properties', () => {
      @Entity()
      class Article extends BaseEntity {
        @PrimaryKey()
        id: number;

        @Property()
        title: string;

        @Property()
        body: string;

        @Computed()
        get excerpt() {
          return this.body?.substring(0, 48) || '';
        }

        @Computed()
        get titleUppercase() {
          return this.title?.toUpperCase() || '';
        }
      }

      const computedProperties = Metadata.get(COMPUTED_PROPERTIES, Article);

      expect(computedProperties).toBeDefined();
      expect(computedProperties).toContain('excerpt');
      expect(computedProperties).toContain('titleUppercase');
      expect(computedProperties.length).toBe(2);
    });

    it('should not interfere with @Property metadata', () => {
      @Entity()
      class User extends BaseEntity {
        @PrimaryKey()
        id: number;

        @Property()
        firstName: string;

        @Property()
        lastName: string;

        @Computed()
        get fullName() {
          return `${this.firstName} ${this.lastName}`;
        }
      }

      const computedProperties = Metadata.get(COMPUTED_PROPERTIES, User);

      expect(computedProperties).toContain('fullName');
      expect(computedProperties).not.toContain('firstName');
      expect(computedProperties).not.toContain('lastName');
    });
  });

  describe('Integration Tests - Serialization', () => {
    beforeEach(async () => {
      await startDatabase();
      await execute(DLL_ARTICLE);
    });

    afterEach(async () => {
      await purgeDatabase();
      await app?.disconnect();
      (mockLogger as jest.Mock).mockClear();
    });

    const DLL_ARTICLE = `
      CREATE TABLE "article" (
        "id" SERIAL PRIMARY KEY,
        "title" varchar(255) NOT NULL,
        "body" text NOT NULL
      );
    `;

    @Entity()
    class Article extends BaseEntity {
      @PrimaryKey()
      id: number;

      @Property()
      title: string;

      @Property()
      body: string;

      @Computed()
      get excerpt() {
        return this.body?.substring(0, 48) || '';
      }
    }

    it('should include computed property in toJSON output', () => {
      Entity()(Article);

      const article = new Article();
      article.id = 1;
      article.title = 'Test Article';
      article.body = 'This is a long body text that will be truncated in the excerpt property.';

      const json = JSON.parse(JSON.stringify(article));

      expect(json.id).toBe(1);
      expect(json.title).toBe('Test Article');
      expect(json.body).toBe('This is a long body text that will be truncated in the excerpt property.');
      expect(json.excerpt).toBe('This is a long body text that will be truncated ');
    });

    it('should include multiple computed properties in toJSON', () => {
      @Entity()
      class User extends BaseEntity {
        @PrimaryKey()
        id: number;

        @Property()
        firstName: string;

        @Property()
        lastName: string;

        @Computed()
        get fullName() {
          return `${this.firstName} ${this.lastName}`;
        }

        @Computed()
        get initials() {
          return `${this.firstName?.[0] || ''}${this.lastName?.[0] || ''}`;
        }
      }

      Entity()(User);

      const user = new User();
      user.id = 1;
      user.firstName = 'John';
      user.lastName = 'Doe';

      const json = JSON.parse(JSON.stringify(user));

      expect(json.fullName).toBe('John Doe');
      expect(json.initials).toBe('JD');
    });

    it('should not persist computed properties to database', async () => {
      Entity()(Article);

      const article = await Article.create({
        title: 'New Article',
        body: 'This is the body of the new article with enough text to be truncated.',
      });

      expect(article.id).toBeDefined();
      expect(article.excerpt).toBe('This is the body of the new article with enough ');

      const fetchedArticle = await Article.findOne({ id: article.id });

      expect(fetchedArticle).toBeDefined();
      expect(fetchedArticle!.title).toBe('New Article');
      expect(fetchedArticle!.body).toBe('This is the body of the new article with enough text to be truncated.');
      expect(fetchedArticle!.excerpt).toBe('This is the body of the new article with enough ');
    });

    it('should handle computed properties with hidden regular properties', () => {
      @Entity()
      class Account extends BaseEntity {
        @PrimaryKey()
        id: number;

        @Property()
        username: string;

        @Property({ hidden: true })
        password: string;

        @Computed()
        get maskedPassword() {
          return '********';
        }
      }

      Entity()(Account);

      const account = new Account();
      account.id = 1;
      account.username = 'johndoe';
      account.password = 'secretpassword';

      const json = JSON.parse(JSON.stringify(account));

      expect(json.username).toBe('johndoe');
      expect(json.password).toBeUndefined();
      expect(json.maskedPassword).toBe('********');
    });

    it('should handle computed properties returning complex types', () => {
      @Entity()
      class Product extends BaseEntity {
        @PrimaryKey()
        id: number;

        @Property()
        name: string;

        @Property()
        price: number;

        @Property()
        discount: number;

        @Computed()
        get priceInfo() {
          return {
            original: this.price,
            discounted: this.price - (this.price * this.discount / 100),
            savings: this.price * this.discount / 100,
          };
        }
      }

      Entity()(Product);

      const product = new Product();
      product.id = 1;
      product.name = 'Laptop';
      product.price = 1000;
      product.discount = 20;

      const json = JSON.parse(JSON.stringify(product));

      expect(json.priceInfo).toBeDefined();
      expect(json.priceInfo.original).toBe(1000);
      expect(json.priceInfo.discounted).toBe(800);
      expect(json.priceInfo.savings).toBe(200);
    });

    it('should handle computed properties with null values', () => {
      @Entity()
      class Comment extends BaseEntity {
        @PrimaryKey()
        id: number;

        @Property({ nullable: true })
        text: string | null;

        @Computed()
        get preview() {
          return this.text?.substring(0, 20) || 'No comment';
        }
      }

      Entity()(Comment);

      const comment1 = new Comment();
      comment1.id = 1;
      comment1.text = null;

      const json1 = JSON.parse(JSON.stringify(comment1));
      expect(json1.preview).toBe('No comment');

      const comment2 = new Comment();
      comment2.id = 2;
      comment2.text = 'This is a comment';

      const json2 = JSON.parse(JSON.stringify(comment2));
      expect(json2.preview).toBe('This is a comment');
    });
  });

  describe('Edge Cases', () => {
    it('should handle entity without computed properties', () => {
      @Entity()
      class SimpleEntity extends BaseEntity {
        @PrimaryKey()
        id: number;

        @Property()
        name: string;
      }

      Entity()(SimpleEntity);

      const entity = new SimpleEntity();
      entity.id = 1;
      entity.name = 'Test';

      const json = JSON.parse(JSON.stringify(entity));

      expect(json.id).toBe(1);
      expect(json.name).toBe('Test');
    });

    it('should handle computed property accessing other computed properties', () => {
      @Entity()
      class Person extends BaseEntity {
        @PrimaryKey()
        id: number;

        @Property()
        firstName: string;

        @Property()
        lastName: string;

        @Computed()
        get fullName() {
          return `${this.firstName} ${this.lastName}`;
        }

        @Computed()
        get greeting() {
          return `Hello, ${this.fullName}!`;
        }
      }

      Entity()(Person);

      const person = new Person();
      person.id = 1;
      person.firstName = 'Jane';
      person.lastName = 'Smith';

      const json = JSON.parse(JSON.stringify(person));

      expect(json.fullName).toBe('Jane Smith');
      expect(json.greeting).toBe('Hello, Jane Smith!');
    });
  });
});
