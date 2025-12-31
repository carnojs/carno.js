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

describe('EXISTS and NOT EXISTS Operators', () => {
  const DDL_AUTHOR = `
    CREATE TABLE "author" (
      "id" SERIAL PRIMARY KEY,
      "name" varchar(255) NOT NULL,
      "email" varchar(255) NOT NULL,
      "created_at" timestamp DEFAULT NOW()
    );
  `;

  const DDL_POST = `
    CREATE TABLE "post" (
      "id" SERIAL PRIMARY KEY,
      "author_id" integer REFERENCES "author" (id),
      "title" varchar(255) NOT NULL,
      "content" text,
      "is_published" boolean DEFAULT false,
      "created_at" timestamp DEFAULT NOW()
    );
  `;

  const DDL_COMMENT = `
    CREATE TABLE "comment" (
      "id" SERIAL PRIMARY KEY,
      "post_id" integer REFERENCES "post" (id),
      "content" text NOT NULL,
      "created_at" timestamp DEFAULT NOW()
    );
  `;

  @Entity()
  class Author extends BaseEntity {
    @PrimaryKey()
    id: number;

    @Property()
    name: string;

    @Property()
    email: string;

    @Property()
    createdAt: Date;

    @OneToMany(() => Post, (post) => post.authorId)
    posts: Post[];
  }

  @Entity()
  class Post extends BaseEntity {
    @PrimaryKey()
    id: number;

    @Property()
    authorId: number;

    @Property()
    title: string;

    @Property()
    content: string;

    @Property()
    isPublished: boolean;

    @Property()
    createdAt: Date;

    @ManyToOne(() => Author)
    author: Author;

    @OneToMany(() => Comment, (comment) => comment.postId)
    comments: Comment[];
  }

  @Entity()
  class Comment extends BaseEntity {
    @PrimaryKey()
    id: number;

    @Property()
    postId: number;

    @Property()
    content: string;

    @Property()
    createdAt: Date;

    @ManyToOne(() => Post)
    post: Post;
  }

  let authorRepo: Repository<Author>;
  let postRepo: Repository<Post>;
  let commentRepo: Repository<Comment>;

  beforeEach(async () => {
    await startDatabase();
    await execute(DDL_AUTHOR);
    await execute(DDL_POST);
    await execute(DDL_COMMENT);
    authorRepo = new Repository(Author);
    postRepo = new Repository(Post);
    commentRepo = new Repository(Comment);
  });

  afterEach(async () => {
    await purgeDatabase();
    await app?.disconnect();
  });

  describe('$exists operator', () => {
    describe('Basic functionality', () => {
      test('Given authors with and without posts When using $exists without filters Then returns only authors with posts', async () => {
        const authorWithPosts = await authorRepo.create({
          name: 'Alice',
          email: 'alice@test.com',
        });
        const authorWithoutPosts = await authorRepo.create({
          name: 'Bob',
          email: 'bob@test.com',
        });
        await postRepo.create({
          title: 'Post 1',
          content: 'Content 1',
          authorId: authorWithPosts.id,
        });

        const results = await authorRepo.find({ where: { posts: { $exists: {} } }});

        expect(results).toHaveLength(1);
        expect(results[0].id).toBe(authorWithPosts.id);
        expect(results[0].name).toBe('Alice');
      });

      test('Given authors with specific posts When using $exists with filters Then returns only matching authors', async () => {
        const alice = await authorRepo.create({
          name: 'Alice',
          email: 'alice@test.com',
        });
        const bob = await authorRepo.create({
          name: 'Bob',
          email: 'bob@test.com',
        });
        await postRepo.create({
          title: 'TypeScript Guide',
          content: 'TypeScript content',
          authorId: alice.id,
        });
        await postRepo.create({
          title: 'Python Guide',
          content: 'Python content',
          authorId: bob.id,
        });

        const results = await authorRepo.find({
          where: {
            posts: { $exists: { title: { $like: '%TypeScript%' } } },
          },
        });

        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('Alice');
      });

      test('Given posts with published filter When using $exists with isPublished Then returns correct authors', async () => {
        const alice = await authorRepo.create({
          name: 'Alice',
          email: 'alice@test.com',
        });
        const bob = await authorRepo.create({
          name: 'Bob',
          email: 'bob@test.com',
        });
        await postRepo.create({
          title: 'Published Post',
          content: 'Content',
          authorId: alice.id,
          isPublished: true,
        });
        await postRepo.create({
          title: 'Draft Post',
          content: 'Content',
          authorId: bob.id,
          isPublished: false,
        });

        const results = await authorRepo.find({
            where: {
            posts: { $exists: { isPublished: true } },
          }
        });

        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('Alice');
      });
    });

    describe('ManyToOne relationships', () => {
      test('Given posts with authors When using $exists on ManyToOne Then returns correct posts', async () => {
        const alice = await authorRepo.create({
          name: 'Alice',
          email: 'alice@test.com',
        });
        const bob = await authorRepo.create({
          name: 'Bob',
          email: 'bob@test.com',
        });
        await postRepo.create({
          title: 'Post 1',
          content: 'Content 1',
          authorId: alice.id,
        });
        await postRepo.create({
          title: 'Post 2',
          content: 'Content 2',
          authorId: bob.id,
        });

        const results = await postRepo.find({
          where: {
            author: { $exists: { name: 'Alice' } },
          },
        });

        expect(results).toHaveLength(1);
        expect(results[0].title).toBe('Post 1');
      });
    });

    describe('Combined with other filters', () => {
      test('Given authors When combining $exists with other filters Then applies all conditions', async () => {
        const alice = await authorRepo.create({
          name: 'Alice',
          email: 'alice@test.com',
        });
        const aliceTwo = await authorRepo.create({
          name: 'Alice',
          email: 'alice2@test.com',
        });
        const bob = await authorRepo.create({
          name: 'Bob',
          email: 'bob@test.com',
        });
        await postRepo.create({
          title: 'Post',
          content: 'Content',
          authorId: alice.id,
        });
        await postRepo.create({
          title: 'Post',
          content: 'Content',
          authorId: bob.id,
        });

        const results = await authorRepo.find({
          where: {
            name: 'Alice',
            posts: { $exists: {} },
          },
        });

        expect(results).toHaveLength(1);
        expect(results[0].email).toBe('alice@test.com');
      });

      test('Given authors When using $exists with $or Then applies logical operators correctly', async () => {
        const alice = await authorRepo.create({
          name: 'Alice',
          email: 'alice@test.com',
        });
        const bob = await authorRepo.create({
          name: 'Bob',
          email: 'bob@test.com',
        });
        const charlie = await authorRepo.create({
          name: 'Charlie',
          email: 'charlie@test.com',
        });
        await postRepo.create({
          title: 'Post',
          content: 'Content',
          authorId: alice.id,
        });

        const results = await authorRepo.find({
          where: {
            $or: [{ posts: { $exists: {} } }, { name: 'Bob' }],
          },
        });

        expect(results).toHaveLength(2);
        const names = results.map((r) => r.name).sort();
        expect(names).toEqual(['Alice', 'Bob']);
      });
    });

    describe('Nested exists (multi-level)', () => {
      test('Given nested relationships When using nested $exists Then returns correct results', async () => {
        const alice = await authorRepo.create({
          name: 'Alice',
          email: 'alice@test.com',
        });
        const bob = await authorRepo.create({
          name: 'Bob',
          email: 'bob@test.com',
        });
        const alicePost = await postRepo.create({
          title: 'Alice Post',
          content: 'Content',
          authorId: alice.id,
        });
        const bobPost = await postRepo.create({
          title: 'Bob Post',
          content: 'Content',
          authorId: bob.id,
        });
        await commentRepo.create({
          content: 'Great post!',
          postId: alicePost.id,
        });

        const results = await authorRepo.find({
          where: {
            posts: { $exists: { comments: { $exists: {} } } },
          }
        });

        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('Alice');
      });
    });

    describe('Multiple $exists in same query', () => {
      test('Given multiple $exists conditions When querying Then applies all exists conditions', async () => {
        const alice = await authorRepo.create({
          name: 'Alice',
          email: 'alice@test.com',
        });
        const bob = await authorRepo.create({
          name: 'Bob',
          email: 'bob@test.com',
        });
        await postRepo.create({
          title: 'Published',
          content: 'Content',
          authorId: alice.id,
          isPublished: true,
        });
        await postRepo.create({
          title: 'Draft',
          content: 'Content',
          authorId: alice.id,
          isPublished: false,
        });
        await postRepo.create({
          title: 'Published',
          content: 'Content',
          authorId: bob.id,
          isPublished: true,
        });

        const results = await authorRepo.find({
          where: {
          $and: [
            { posts: { $exists: { isPublished: true } } },
            { posts: { $exists: { isPublished: false } } },
          ],
        }
        });

        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('Alice');
      });
    });
  });

  describe('$nexists operator', () => {
    describe('Basic functionality', () => {
      test('Given authors with and without posts When using $nexists without filters Then returns only authors without posts', async () => {
        const authorWithPosts = await authorRepo.create({
          name: 'Alice',
          email: 'alice@test.com',
        });
        const authorWithoutPosts = await authorRepo.create({
          name: 'Bob',
          email: 'bob@test.com',
        });
        await postRepo.create({
          title: 'Post 1',
          content: 'Content 1',
          authorId: authorWithPosts.id,
        });

        const results = await authorRepo.find({ where: { posts: { $nexists: {} } } });

        expect(results).toHaveLength(1);
        expect(results[0].id).toBe(authorWithoutPosts.id);
        expect(results[0].name).toBe('Bob');
      });

      test('Given authors When using $nexists with filters Then returns authors without matching posts', async () => {
        const alice = await authorRepo.create({
          name: 'Alice',
          email: 'alice@test.com',
        });
        const bob = await authorRepo.create({
          name: 'Bob',
          email: 'bob@test.com',
        });
        await postRepo.create({
          title: 'Draft',
          content: 'Content',
          authorId: alice.id,
          isPublished: false,
        });
        await postRepo.create({
          title: 'Published',
          content: 'Content',
          authorId: bob.id,
          isPublished: true,
        });

        const results = await authorRepo.find({
          where: {
            posts: { $nexists: { isPublished: true } },
          },
        });

        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('Alice');
      });
    });
  });

  describe('Error handling', () => {
    test('Given non-relationship field When using $exists Then throws descriptive error', async () => {
      await expect(
        authorRepo.find({ where: { name: { $exists: {} } } } as any),
      ).rejects.toThrow(/Cannot use \$exists on non-relationship field/);
    });

    test('Given non-relationship field When using $nexists Then throws descriptive error', async () => {
      await expect(
        authorRepo.find({ where: { email: { $nexists: {} } } } as any),
      ).rejects.toThrow(/Cannot use \$nexists on non-relationship field/);
    });
  });

  describe('Integration with JOINs', () => {
    test('Given query with $exists and load When using joined strategy Then both work together', async () => {
      const alice = await authorRepo.create({
        name: 'Alice',
        email: 'alice@test.com',
      });
      const bob = await authorRepo.create({
        name: 'Bob',
        email: 'bob@test.com',
      });
      await postRepo.create({
        title: 'Post',
        content: 'Content',
        authorId: alice.id,
      });

      const results = await authorRepo.find({
        where: { posts: { $exists: {} } },
        load: ['posts'],
        loadStrategy: 'joined',
      });

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Alice');
      expect(results[0].posts).toBeDefined();
      expect(results[0].posts.length).toBe(1);
      expect(results[0].posts[0].title).toBe('Post');
    });
  });
});
