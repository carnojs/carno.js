# Testing Helpers

The `@cheetah.js/orm` package ships a utility named `withDatabase` to streamline integration tests that depend on PostgreSQL.

- **Purpose**: Simplify lifecycle management by starting the ORM, executing schema setup statements, providing a typed context, and cleaning the schema automatically after the callback completes.
- **Usage**:
  ```ts
  import {withDatabase} from '@cheetah.js/orm/testing';

  const COURSES_TABLE = `
    CREATE TABLE "courses" (
      "id" SERIAL PRIMARY KEY,
      "title" varchar(255) NOT NULL
    );
  `;

  await withDatabase([COURSES_TABLE], async (context) => {
    await context.executeSql(`INSERT INTO "courses" ("title") VALUES ('Cheetah Mastery');`);
    const result = await context.executeSql(`SELECT COUNT(*)::int AS total FROM "courses";`);
    expect(result.rows[0]?.total).toBe(1);
  });
  ```
- **Parameters**:
  - Array of SQL strings that describe the schema for the scenario under test.
  - Async callback that receives a `DatabaseTestContext` with the current ORM instance and an `executeSql` helper bound to the driver.
- **Guarantees**: The helper recreates the `public` schema before finishing and closes the driver connection, ensuring tests run in isolation with minimal boilerplate.
