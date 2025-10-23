import {describe, expect, test} from 'bun:test';
import {withDatabase, DatabaseTestContext} from '../src/testing';

const USERS_TABLE = `
  CREATE TABLE "users" (
    "id" SERIAL PRIMARY KEY,
    "name" varchar(255) NOT NULL
  );
`;

async function insertUser(context: DatabaseTestContext): Promise<void> {
  await context.executeSql(`
    INSERT INTO "users" ("name") VALUES ('tester');
  `);
}

async function countUsers(context: DatabaseTestContext): Promise<number> {
  const result = await context.executeSql(`
    SELECT COUNT(*)::int AS total FROM "users";
  `);

  return result.rows[0]?.total ?? 0;
}

describe('Database test helper', () => {
  test('withDatabase prepares schema and resets state between runs', async () => {
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
  });
});
