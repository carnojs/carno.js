import { describe, expect, it } from 'bun:test';
import { Ref, ref, unwrap, isLoaded, Reference } from '../../src';

describe('Ref<T> - Transparent Wrapper for Circular Dependencies', () => {

  class User {
    id: number;
    name: string;
    email: string;

    constructor(id: number, name: string, email: string) {
      this.id = id;
      this.name = name;
      this.email = email;
    }
  }

  class Post {
    id: number;
    title: string;
    author: Ref<User>;

    constructor(id: number, title: string, author: Ref<User>) {
      this.id = id;
      this.title = title;
      this.author = author;
    }
  }

  describe('Type Transparency', () => {

    it('should accept T directly as Ref<T>', () => {

      const user = new User(1, 'John Doe', 'john@example.com');
      const post = new Post(1, 'My Post', user);

      expect(post.author).toBe(user);
      expect(post.author.id).toBe(1);
      expect(post.author.name).toBe('John Doe');
      expect(post.author.email).toBe('john@example.com');
    });

    it('should work with arrays of Ref<T>', () => {

      const user1 = new User(1, 'Alice', 'alice@example.com');
      const user2 = new User(2, 'Bob', 'bob@example.com');
      const authors: Ref<User>[] = [user1, user2];

      expect(authors).toHaveLength(2);
      expect(authors[0]).toBe(user1);
      expect(authors[1]).toBe(user2);
      expect(authors[0].name).toBe('Alice');
      expect(authors[1].name).toBe('Bob');
    });

    it('should work with optional Ref<T>', () => {

      const user: Ref<User> | undefined = new User(1, 'Jane', 'jane@example.com');
      const noUser: Ref<User> | undefined = undefined;

      expect(user).toBeDefined();
      expect(user?.name).toBe('Jane');
      expect(noUser).toBeUndefined();
    });
  });

  describe('ref() - Identity Function', () => {

    it('should return the same entity unchanged', () => {

      const user = new User(1, 'John', 'john@example.com');
      const userRef = ref(user);

      expect(userRef).toBe(user);
      expect(userRef === user).toBe(true);
    });

    it('should work with any type', () => {

      const num = ref(42);
      const str = ref('hello');
      const obj = ref({ foo: 'bar' });
      const arr = ref([1, 2, 3]);

      expect(num).toBe(42);
      expect(str).toBe('hello');
      expect(obj).toEqual({ foo: 'bar' });
      expect(arr).toEqual([1, 2, 3]);
    });

    it('should preserve object reference', () => {

      const user = new User(1, 'Alice', 'alice@example.com');
      const ref1 = ref(user);
      const ref2 = ref(user);

      expect(ref1).toBe(ref2);
      expect(ref1).toBe(user);
    });
  });

  describe('unwrap() - Identity Function', () => {

    it('should return the same value unchanged', () => {

      const user = new User(1, 'Bob', 'bob@example.com');
      const userRef: Ref<User> = user;
      const unwrapped = unwrap(userRef);

      expect(unwrapped).toBe(user);
      expect(unwrapped === user).toBe(true);
    });

    it('should work with ref() output', () => {

      const user = new User(1, 'Charlie', 'charlie@example.com');
      const userRef = ref(user);
      const unwrapped = unwrap(userRef);

      expect(unwrapped).toBe(user);
      expect(unwrapped.name).toBe('Charlie');
    });

    it('should be composable with ref()', () => {

      const user = new User(1, 'David', 'david@example.com');
      const result = unwrap(ref(user));

      expect(result).toBe(user);
    });
  });

  describe('isLoaded() - Type Guard', () => {

    it('should return true for loaded references', () => {

      const user = new User(1, 'Eve', 'eve@example.com');
      const userRef: Ref<User> = user;

      expect(isLoaded(userRef)).toBe(true);
    });

    it('should return false for null', () => {

      const userRef: Ref<User> | null = null;

      expect(isLoaded(userRef)).toBe(false);
    });

    it('should return false for undefined', () => {

      const userRef: Ref<User> | undefined = undefined;

      expect(isLoaded(userRef)).toBe(false);
    });

    it('should narrow type when true', () => {

      const maybeUser: Ref<User> | undefined = new User(1, 'Frank', 'frank@example.com');

      if (isLoaded(maybeUser)) {
        expect(maybeUser.name).toBe('Frank');
      }
    });

    it('should work with null or undefined union', () => {

      const user1: Ref<User> | null | undefined = new User(1, 'Grace', 'grace@example.com');
      const user2: Ref<User> | null | undefined = null;
      const user3: Ref<User> | null | undefined = undefined;

      expect(isLoaded(user1)).toBe(true);
      expect(isLoaded(user2)).toBe(false);
      expect(isLoaded(user3)).toBe(false);
    });
  });

  describe('Zero Runtime Overhead', () => {

    it('should have no performance penalty', () => {

      const user = new User(1, 'Helen', 'helen@example.com');
      const refUser = ref(user);
      const unwrappedUser = unwrap(refUser);

      expect(user === refUser).toBe(true);
      expect(user === unwrappedUser).toBe(true);
      expect(refUser === unwrappedUser).toBe(true);
    });

    it('should not create wrapper objects', () => {

      const user = new User(1, 'Ian', 'ian@example.com');
      const userRef: Ref<User> = user;

      expect(typeof userRef).toBe('object');
      expect(userRef.constructor.name).toBe('User');
    });
  });

  describe('Backward Compatibility - Reference Class', () => {

    it('should support legacy Reference class', () => {

      const user = new User(1, 'Jack', 'jack@example.com');
      const reference = new Reference(user);

      expect(reference).toBeInstanceOf(Reference);
      expect(reference.get()).toBe(user);
    });

    it('should preserve entity in Reference class', () => {

      const user = new User(1, 'Kate', 'kate@example.com');
      const reference = new Reference(user);
      const retrieved = reference.get();

      expect(retrieved).toBe(user);
      expect(retrieved.name).toBe('Kate');
    });
  });

  describe('Real-world Usage Examples', () => {

    it('should prevent circular dependencies in entity definitions', () => {

      class Author {
        id: number;
        name: string;

        constructor(id: number, name: string) {
          this.id = id;
          this.name = name;
        }
      }

      class Article {
        id: number;
        title: string;
        author: Ref<Author>;

        constructor(id: number, title: string, author: Ref<Author>) {
          this.id = id;
          this.title = title;
          this.author = author;
        }
      }

      const author = new Author(1, 'John Doe');
      const article = new Article(1, 'TypeScript Tips', author);

      expect(article.author).toBe(author);
      expect(article.author.name).toBe('John Doe');
    });

    it('should work with nested relationships', () => {

      class Category {
        id: number;
        name: string;

        constructor(id: number, name: string) {
          this.id = id;
          this.name = name;
        }
      }

      class Product {
        id: number;
        name: string;
        category: Ref<Category>;

        constructor(id: number, name: string, category: Ref<Category>) {
          this.id = id;
          this.name = name;
          this.category = category;
        }
      }

      class OrderItem {
        id: number;
        quantity: number;
        product: Ref<Product>;

        constructor(id: number, quantity: number, product: Ref<Product>) {
          this.id = id;
          this.quantity = quantity;
          this.product = product;
        }
      }

      const category = new Category(1, 'Electronics');
      const product = new Product(1, 'Laptop', category);
      const orderItem = new OrderItem(1, 2, product);

      expect(orderItem.product).toBe(product);
      expect(orderItem.product.category).toBe(category);
      expect(orderItem.product.category.name).toBe('Electronics');
    });

    it('should allow multiple references to same entity', () => {

      const user = new User(1, 'Admin', 'admin@example.com');
      const post1 = new Post(1, 'Post 1', user);
      const post2 = new Post(2, 'Post 2', user);

      expect(post1.author).toBe(post2.author);
      expect(post1.author).toBe(user);
      expect(post2.author).toBe(user);
    });
  });
});
