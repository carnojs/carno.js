import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { app, execute, purgeDatabase, startDatabase } from '../node-database';
import {
  BaseEntity,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property,
  Repository,
} from '../../src';

describe('COUNT Operations', () => {
  const DDL_USER = `
    CREATE TABLE "user" (
      "id" SERIAL PRIMARY KEY,
      "name" varchar(255) NOT NULL,
      "email" varchar(255) NOT NULL,
      "age" integer,
      "is_active" boolean DEFAULT true,
      "created_at" timestamp DEFAULT NOW()
    );
  `;

  const DDL_POST = `
    CREATE TABLE "post" (
      "id" SERIAL PRIMARY KEY,
      "user_id" integer REFERENCES "user" ("id"),
      "title" varchar(255) NOT NULL,
      "content" text,
      "views" integer DEFAULT 0,
      "is_published" boolean DEFAULT false,
      "created_at" timestamp DEFAULT NOW()
    );
  `;

  @Entity()
  class User extends BaseEntity {
    @PrimaryKey()
    id: number;

    @Property()
    name: string;

    @Property()
    email: string;

    @Property()
    age: number;

    @Property()
    isActive: boolean;

    @Property()
    createdAt: Date;

    @OneToMany(() => Post, (post) => post.userId)
    posts: Post[];
  }

  @Entity()
  class Post extends BaseEntity {
    @PrimaryKey()
    id: number;

    @Property()
    userId: number;

    @Property()
    title: string;

    @Property()
    content: string;

    @Property()
    views: number;

    @Property()
    isPublished: boolean;

    @Property()
    createdAt: Date;

    @ManyToOne(() => User)
    user: User;
  }

  class UserRepository extends Repository<User> {
    constructor() {
      super(User);
    }
  }

  class PostRepository extends Repository<Post> {
    constructor() {
      super(Post);
    }
  }

  let userRepo: UserRepository;
  let postRepo: PostRepository;

  beforeEach(async () => {
    console.log('Preparing count tests...');
    await startDatabase();
    await execute(DDL_USER);
    await execute(DDL_POST);
    userRepo = new UserRepository();
    postRepo = new PostRepository();
    console.log('Count tests prepared!');
  });

  afterEach(async () => {
    await purgeDatabase();
    await app?.disconnect();
  });

  describe('Basic COUNT operations', () => {
    test('should count zero when table is empty', async () => {
      // Given: Empty table

      // When: Counting all users
      const count = await userRepo.count();

      // Then: Should return 0
      expect(count).toBe(0);
    });

    test('should count all records without filter', async () => {
      // Given: 5 users in database
      await userRepo.create({ name: 'User 1', email: 'user1@test.com', age: 20 });
      await userRepo.create({ name: 'User 2', email: 'user2@test.com', age: 25 });
      await userRepo.create({ name: 'User 3', email: 'user3@test.com', age: 30 });
      await userRepo.create({ name: 'User 4', email: 'user4@test.com', age: 35 });
      await userRepo.create({ name: 'User 5', email: 'user5@test.com', age: 40 });

      // When: Counting all users
      const count = await userRepo.count();

      // Then: Should return 5
      expect(count).toBe(5);
    });

    test('should count large number of records', async () => {
      // Given: 100 users in database
      const promises = [];
      for (let i = 1; i <= 100; i++) {
        promises.push(
          userRepo.create({
            name: `User ${i}`,
            email: `user${i}@test.com`,
            age: 20 + (i % 50),
          })
        );
      }
      await Promise.all(promises);

      // When: Counting all users
      const count = await userRepo.count();

      // Then: Should return 100
      expect(count).toBe(100);
    });
  });

  describe('COUNT with WHERE filters', () => {
    beforeEach(async () => {
      // Given: Users with different attributes
      await userRepo.create({
        name: 'Active User 1',
        email: 'active1@test.com',
        age: 25,
        isActive: true,
      });
      await userRepo.create({
        name: 'Active User 2',
        email: 'active2@test.com',
        age: 30,
        isActive: true,
      });
      await userRepo.create({
        name: 'Inactive User',
        email: 'inactive@test.com',
        age: 35,
        isActive: false,
      });
      await userRepo.create({
        name: 'Active User 3',
        email: 'active3@test.com',
        age: 40,
        isActive: true,
      });
    });

    test('should count with simple equality filter', async () => {
      // When: Counting active users
      const count = await userRepo.count({ isActive: true });

      // Then: Should return 3
      expect(count).toBe(3);
    });

    test('should count with multiple conditions', async () => {
      // When: Counting active users older than 28
      const count = await userRepo.count({
        isActive: true,
        age: { $gt: 28 },
      });

      // Then: Should return 2 (age 30 and 40)
      expect(count).toBe(2);
    });

    test('should count with $in operator', async () => {
      // When: Counting users with specific ages
      const count = await userRepo.count({
        age: { $in: [25, 35] },
      });

      // Then: Should return 2
      expect(count).toBe(2);
    });

    test('should count with $gt operator', async () => {
      // When: Counting users older than 30
      const count = await userRepo.count({
        age: { $gt: 30 },
      });

      // Then: Should return 2 (age 35 and 40)
      expect(count).toBe(2);
    });

    test('should count with $gte operator', async () => {
      // When: Counting users 30 or older
      const count = await userRepo.count({
        age: { $gte: 30 },
      });

      // Then: Should return 3 (age 30, 35, 40)
      expect(count).toBe(3);
    });

    test('should count with $lt operator', async () => {
      // When: Counting users younger than 30
      const count = await userRepo.count({
        age: { $lt: 30 },
      });

      // Then: Should return 1 (age 25)
      expect(count).toBe(1);
    });

    test('should count with $lte operator', async () => {
      // When: Counting users 30 or younger
      const count = await userRepo.count({
        age: { $lte: 30 },
      });

      // Then: Should return 2 (age 25, 30)
      expect(count).toBe(2);
    });

    test('should count with $ne operator', async () => {
      // When: Counting users not age 30
      const count = await userRepo.count({
        age: { $ne: 30 },
      });

      // Then: Should return 3
      expect(count).toBe(3);
    });

    test('should return zero when no records match filter', async () => {
      // When: Counting users with non-existent age
      const count = await userRepo.count({
        age: 99,
      });

      // Then: Should return 0
      expect(count).toBe(0);
    });
  });

  describe('COUNT with complex queries', () => {
    beforeEach(async () => {
      // Given: Users and posts
      const user1 = await userRepo.create({
        name: 'User 1',
        email: 'user1@test.com',
        age: 25,
      });
      const user2 = await userRepo.create({
        name: 'User 2',
        email: 'user2@test.com',
        age: 30,
      });

      await postRepo.create({
        userId: user1.id,
        title: 'Post 1',
        content: 'Content 1',
        isPublished: true,
        views: 100,
      });
      await postRepo.create({
        userId: user1.id,
        title: 'Post 2',
        content: 'Content 2',
        isPublished: false,
        views: 50,
      });
      await postRepo.create({
        userId: user2.id,
        title: 'Post 3',
        content: 'Content 3',
        isPublished: true,
        views: 200,
      });
      await postRepo.create({
        userId: user2.id,
        title: 'Post 4',
        content: 'Content 4',
        isPublished: true,
        views: 150,
      });
    });

    test('should count posts by user', async () => {
      // When: Counting posts for user 1
      const user1 = await userRepo.findOne({ where: { email: 'user1@test.com' } });
      const count = await postRepo.count({ userId: user1!.id });

      // Then: Should return 2
      expect(count).toBe(2);
    });

    test('should count published posts', async () => {
      // When: Counting published posts
      const count = await postRepo.count({ isPublished: true });

      // Then: Should return 3
      expect(count).toBe(3);
    });

    test('should count posts with high views', async () => {
      // When: Counting posts with more than 100 views
      const count = await postRepo.count({
        views: { $gt: 100 },
      });

      // Then: Should return 2 (150 and 200)
      expect(count).toBe(2);
    });

    test('should count with multiple complex conditions', async () => {
      // When: Counting published posts with views >= 150
      const count = await postRepo.count({
        isPublished: true,
        views: { $gte: 150 },
      });

      // Then: Should return 2
      expect(count).toBe(2);
    });
  });

  describe('COUNT using SqlBuilder directly', () => {
    beforeEach(async () => {
      // Given: Sample data
      await userRepo.create({ name: 'User 1', email: 'user1@test.com', age: 25 });
      await userRepo.create({ name: 'User 2', email: 'user2@test.com', age: 30 });
      await userRepo.create({ name: 'User 3', email: 'user3@test.com', age: 35 });
    });

    test('should count using createQueryBuilder', async () => {
      // When: Using query builder to count
      const count = await User.createQueryBuilder<User>()
        .count()
        .executeCount();

      // Then: Should return 3
      expect(count).toBe(3);
    });

    test('should count with where using query builder', async () => {
      // When: Using query builder with where clause
      const count = await User.createQueryBuilder<User>()
        .count()
        .where({ age: { $gte: 30 } })
        .executeCount();

      // Then: Should return 2
      expect(count).toBe(2);
    });
  });

  describe('COUNT performance validation', () => {
    test('should be faster than fetching all records', async () => {
      // Given: 50 users in database
      const promises = [];
      for (let i = 1; i <= 50; i++) {
        promises.push(
          userRepo.create({
            name: `User ${i}`,
            email: `user${i}@test.com`,
            age: 20 + (i % 30),
          })
        );
      }
      await Promise.all(promises);

      // When: Counting with COUNT method
      const countStartTime = Date.now();
      const count = await userRepo.count();
      const countDuration = Date.now() - countStartTime;

      // When: Fetching all and getting length
      const fetchStartTime = Date.now();
      const all = await userRepo.findAll();
      const fetchDuration = Date.now() - fetchStartTime;

      // Then: Count should return correct value
      expect(count).toBe(50);
      expect(all.length).toBe(50);

      // Then: COUNT should be faster (or at least not significantly slower)
      console.log(`COUNT duration: ${countDuration}ms`);
      console.log(`FETCH ALL duration: ${fetchDuration}ms`);
      console.log(`Performance gain: ${((fetchDuration - countDuration) / fetchDuration * 100).toFixed(2)}%`);
    });
  });

  describe('COUNT edge cases', () => {
    test('should handle count with empty where object', async () => {
      // Given: 3 users
      await userRepo.create({ name: 'User 1', email: 'user1@test.com', age: 25 });
      await userRepo.create({ name: 'User 2', email: 'user2@test.com', age: 30 });
      await userRepo.create({ name: 'User 3', email: 'user3@test.com', age: 35 });

      // When: Counting with empty where
      const count = await userRepo.count({});

      // Then: Should count all
      expect(count).toBe(3);
    });

    test('should handle count with undefined where', async () => {
      // Given: 2 users
      await userRepo.create({ name: 'User 1', email: 'user1@test.com', age: 25 });
      await userRepo.create({ name: 'User 2', email: 'user2@test.com', age: 30 });

      // When: Counting with undefined
      const count = await userRepo.count(undefined);

      // Then: Should count all
      expect(count).toBe(2);
    });

    test('should return number type', async () => {
      // Given: 1 user
      await userRepo.create({ name: 'User 1', email: 'user1@test.com', age: 25 });

      // When: Counting
      const count = await userRepo.count();

      // Then: Should be a number
      expect(typeof count).toBe('number');
      expect(Number.isInteger(count)).toBe(true);
    });
  });
});
