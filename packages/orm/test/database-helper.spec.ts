import path from 'path';
import {describe, expect, test} from 'bun:test';
import {withDatabase, DatabaseTestContext} from '../src/testing';

const USERS_TABLE = `
  CREATE TABLE "users" (
    "id" SERIAL PRIMARY KEY,
    "name" varchar(255) NOT NULL
  );
`;

const MIGRATIONS_GLOB = path.resolve(
  import.meta.dir,
  'fixtures/migrations/*.sql',
);

async function insertUser(context: DatabaseTestContext): Promise<void> {
  await context.executeSql(`
    INSERT INTO "users" ("name") VALUES ('tester');
  `);
}

async function countUsers(context: DatabaseTestContext): Promise<number> {
  return countRows(context, 'users');
}

async function insertAccount(context: DatabaseTestContext): Promise<void> {
  await context.executeSql(`
    INSERT INTO "accounts" ("email") VALUES ('user@test.dev');
  `);
}

async function countRows(context: DatabaseTestContext, table: string): Promise<number> {
  const result = await context.executeSql(
    `SELECT COUNT(*) AS total FROM "${table}";`,
  );

  const total = result.rows[0]?.total ?? 0;

  return Number(total);
}

describe('Database test helper', () => {
  test(
    'withDatabase prepares schema and resets state between runs',
    async () => {
    await withDatabase([USERS_TABLE], async (context) => {
      // Given
      const usersBeforeInsert = await countUsers(context);
      // When
      await insertUser(context);
      const usersAfterInsert = await countUsers(context);
      // Then
      expect(usersBeforeInsert).toBe(0);
      expect(usersAfterInsert).toBe(1);
    });

    await withDatabase([USERS_TABLE], async (context) => {
      // Given
      const usersOnFreshSchema = await countUsers(context);
      // When
      const shouldStayEmpty = await countUsers(context);
      // Then
      expect(usersOnFreshSchema).toBe(0);
      expect(shouldStayEmpty).toBe(0);
    });
  },
    {timeout: 10_000},
  );

  test(
    'withDatabase derives schema from migrations when statements omitted',
    async () => {
    await withDatabase(
      async (context) => {
        // Given
        const beforeInsert = await countRows(context, 'accounts');
        // When
        await insertAccount(context);
        const afterInsert = await countRows(context, 'accounts');
        // Then
        expect(beforeInsert).toBe(0);
        expect(afterInsert).toBe(1);
      },
      {
        connection: { migrationPath: MIGRATIONS_GLOB },
      },
    );
  },
    {timeout: 10_000},
  );
});
