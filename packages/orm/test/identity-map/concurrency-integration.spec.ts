import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { app, execute, purgeDatabase, startDatabase } from '../node-database';
import { BaseEntity, Entity, ManyToOne, PrimaryKey, Property } from '../../src';
import { identityMapContext } from '../../src/identity-map';

describe('Identity Map Concurrency Integration', () => {
  const DDL_USER = `
    CREATE TABLE "user" (
      "id" SERIAL PRIMARY KEY,
      "email" varchar(255) NOT NULL
    );
  `;

  const DDL_ORDER = `
    CREATE TABLE "order" (
      "id" SERIAL PRIMARY KEY,
      "total" decimal(10, 2) NOT NULL,
      "user_id" integer REFERENCES "user" ("id")
    );
  `;

  @Entity()
  class User extends BaseEntity {
    @PrimaryKey()
    id: number;

    @Property()
    email: string;
  }

  @Entity()
  class Order extends BaseEntity {
    @PrimaryKey()
    id: number;

    @Property()
    total: number;

    @Property()
    userId: number;

    @ManyToOne(() => User)
    user: User;
  }

  beforeEach(async () => {
    await startDatabase();
    await execute(DDL_USER);
    await execute(DDL_ORDER);
  });

  afterEach(async () => {
    await purgeDatabase();
    await app?.disconnect();
  });

  describe('Concurrent Queries Within Context', () => {
    test('When parallel queries for same entity, Then both get cached', async () => {
      await identityMapContext.run(async () => {
        // Given
        await User.create({ id: 1, email: 'test@test.com' });

        // When
        const [user1, user2] = await Promise.all([
          User.findOne({ id: 1 }),
          User.findOne({ id: 1 }),
        ]);

        // Then
        expect(user1).toBeDefined();
        expect(user2).toBeDefined();
      });
    });

    test('When parallel queries for different entities, Then all cached', async () => {
      await identityMapContext.run(async () => {
        // Given
        await User.create({ id: 1, email: 'user1@test.com' });
        await User.create({ id: 2, email: 'user2@test.com' });
        await User.create({ id: 3, email: 'user3@test.com' });

        // When
        const [user1, user2, user3] = await Promise.all([
          User.findOne({ id: 1 }),
          User.findOne({ id: 2 }),
          User.findOne({ id: 3 }),
        ]);

        // Then
        const user1Again = await User.findOne({ id: 1 });
        const user2Again = await User.findOne({ id: 2 });
        const user3Again = await User.findOne({ id: 3 });

        expect(user1).toBe(user1Again);
        expect(user2).toBe(user2Again);
        expect(user3).toBe(user3Again);
      });
    });
  });

  describe('Async Context Propagation', () => {
    test('When using nested async calls, Then context preserved', async () => {
      await identityMapContext.run(async () => {
        // Given
        await User.create({ id: 1, email: 'test@test.com' });

        // When
        const user1 = await User.findOne({ id: 1 });

        const nestedResult = await (async () => {
          return await User.findOne({ id: 1 });
        })();

        // Then
        expect(user1).toBe(nestedResult);
      });
    });

    test('When using Promise.all with context, Then context shared', async () => {
      await identityMapContext.run(async () => {
        // Given
        await User.create({ id: 1, email: 'user@test.com' });
        await Order.create({ id: 1, total: 100, userId: 1 });
        await Order.create({ id: 2, total: 200, userId: 1 });

        // When
        const [order1, order2] = await Promise.all([
          Order.findOne({ id: 1 }, { load: ['user'] }),
          Order.findOne({ id: 2 }, { load: ['user'] }),
        ]);

        // Then
        expect(order1?.user).toBe(order2?.user);
      });
    });

    test('When deeply nested async, Then context still works', async () => {
      await identityMapContext.run(async () => {
        // Given
        await User.create({ id: 1, email: 'test@test.com' });

        // When
        const user1 = await User.findOne({ id: 1 });

        const deepNested = await (async () => {
          return await (async () => {
            return await (async () => {
              return await User.findOne({ id: 1 });
            })();
          })();
        })();

        // Then
        expect(user1).toBe(deepNested);
      });
    });
  });

  describe('Multiple Parallel Contexts', () => {
    test('When many parallel contexts, Then all isolated', async () => {
      // Given
      await User.create({ id: 1, email: 'test@test.com' });

      const contextCount = 10;
      const results: User[] = [];

      // When
      await Promise.all(
        Array.from({ length: contextCount }, () =>
          identityMapContext.run(async () => {
            const user = await User.findOne({ id: 1 });
            results.push(user!);
          })
        )
      );

      // Then
      for (let i = 0; i < contextCount - 1; i++) {
        for (let j = i + 1; j < contextCount; j++) {
          expect(results[i]).not.toBe(results[j]);
        }
      }
    });

    test('When contexts with shared setup, Then entities isolated', async () => {
      // Given
      await User.create({ id: 1, email: 'test@test.com' });

      const context1Results: User[] = [];
      const context2Results: User[] = [];

      // When
      await Promise.all([
        identityMapContext.run(async () => {
          context1Results.push((await User.findOne({ id: 1 }))!);
          context1Results.push((await User.findOne({ id: 1 }))!);
          context1Results.push((await User.findOne({ id: 1 }))!);
        }),
        identityMapContext.run(async () => {
          context2Results.push((await User.findOne({ id: 1 }))!);
          context2Results.push((await User.findOne({ id: 1 }))!);
          context2Results.push((await User.findOne({ id: 1 }))!);
        }),
      ]);

      // Then - within context, same instance
      expect(context1Results[0]).toBe(context1Results[1]);
      expect(context1Results[1]).toBe(context1Results[2]);
      expect(context2Results[0]).toBe(context2Results[1]);
      expect(context2Results[1]).toBe(context2Results[2]);

      // Then - between contexts, different instances
      expect(context1Results[0]).not.toBe(context2Results[0]);
    });
  });

  describe('Simulated Request Handling', () => {
    test('When simulating multiple requests, Then each isolated', async () => {
      // Given
      await User.create({ id: 1, email: 'test@test.com' });

      const handleRequest = async (requestId: number) => {
        return identityMapContext.run(async () => {
          const user1 = await User.findOne({ id: 1 });
          const user2 = await User.findOne({ id: 1 });

          return {
            requestId,
            user1,
            user2,
            sameInstance: user1 === user2,
          };
        });
      };

      // When
      const results = await Promise.all([
        handleRequest(1),
        handleRequest(2),
        handleRequest(3),
      ]);

      // Then
      results.forEach((result) => {
        expect(result.sameInstance).toBe(true);
      });

      expect(results[0].user1).not.toBe(results[1].user1);
      expect(results[1].user1).not.toBe(results[2].user1);
    });

    test('When request loads related entities, Then shares instances', async () => {
      // Given
      await User.create({ id: 1, email: 'user@test.com' });
      for (let i = 1; i <= 5; i++) {
        await Order.create({ id: i, total: i * 100, userId: 1 });
      }

      const handleRequest = async () => {
        return identityMapContext.run(async () => {
          const orders = await Order.findAll({}, { load: ['user'] });
          const users = orders.map((o) => o.user);

          return { orders, users };
        });
      };

      // When
      const result = await handleRequest();

      // Then
      const firstUser = result.users[0];
      result.users.forEach((user) => {
        expect(user).toBe(firstUser);
      });
    });
  });

  describe('Sequential Operations', () => {
    test('When sequential creates and queries, Then all cached', async () => {
      await identityMapContext.run(async () => {
        // When
        const user1 = await User.create({ id: 1, email: 'user1@test.com' });
        const user2 = await User.create({ id: 2, email: 'user2@test.com' });

        const queried1 = await User.findOne({ id: 1 });
        const queried2 = await User.findOne({ id: 2 });

        // Then
        expect(user1).toBe(queried1);
        expect(user2).toBe(queried2);
      });
    });

    test('When alternating creates and queries, Then maintains cache', async () => {
      await identityMapContext.run(async () => {
        // When
        const user1 = await User.create({ id: 1, email: 'user1@test.com' });
        const queried1 = await User.findOne({ id: 1 });

        const user2 = await User.create({ id: 2, email: 'user2@test.com' });
        const queried2 = await User.findOne({ id: 2 });

        const reQueried1 = await User.findOne({ id: 1 });

        // Then
        expect(user1).toBe(queried1);
        expect(user2).toBe(queried2);
        expect(user1).toBe(reQueried1);
      });
    });
  });

  describe('Error Handling', () => {
    test('When query fails, Then context continues working', async () => {
      await identityMapContext.run(async () => {
        // Given
        await User.create({ id: 1, email: 'test@test.com' });

        // When
        const user1 = await User.findOne({ id: 1 });

        try {
          await User.findOne({ invalidField: 'value' } as any);
        } catch {
          // Expected to fail
        }

        const user2 = await User.findOne({ id: 1 });

        // Then
        expect(user1).toBe(user2);
      });
    });
  });
});
