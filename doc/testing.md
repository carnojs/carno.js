# Testing Helpers

## Database-focused tests

Use `withDatabase` from `@cheetah.js/orm/testing` to prepare PostgreSQL fixtures.

- **Purpose**: Initialize the ORM, optionally execute schema statements, expose a lightweight context, and always reset the schema.
- **Usage with migrations**:
  ```ts
  import {withDatabase} from '@cheetah.js/orm/testing';

  await withDatabase(async (context) => {
    await context.executeSql(`INSERT INTO "courses" ("title") VALUES ('Cheetah Mastery');`);
    const result = await context.executeSql(`SELECT COUNT(*)::int AS total FROM "courses";`);
    expect(result.rows[0]?.total).toBe(1);
  }, {
    connection: {migrationPath: 'apps/api/migrations/**/*.sql'},
  });
  ```
- **Explicit statements (backward compatible)**:
  ```ts
  await withDatabase(async (context) => {
    // ...
  }, undefined, [COURSES_TABLE]);
  ```
- **Parameters**:
  - `routine`: Async callback that receives a `DatabaseTestContext` with the ORM instance and an `executeSql` helper.
  - `options` _(optional)_: Overrides for schema, logger, entity file, or connection (including `migrationPath`).
  - `tables` _(optional)_: Array of SQL statements executed before the routine when migrations are not available.
- **Guarantees**: The helper ensures the schema exists, runs SQL statements sequentially, and recreates the schema after the routine to preserve isolation.

## Full application harness

The `@cheetah.js/core` package now ships a test harness inspired by NestJS utilities.

- **Helpers**:
  - `createCoreTestHarness(options)` returns an object with `app`, `injector`, optional `server`, a `resolve(token)` helper, an HTTP `request` helper (when listening), and a `close()` teardown.
  - `withCoreApplication(routine, options)` wraps harness creation and teardown in a single call.
- **Usage**:
  ```ts
  import {withCoreApplication} from '@cheetah.js/core/testing';
  import {Controller, Get} from '@cheetah.js/core';

  @Controller({path: '/status'})
  class StatusController {
    @Get()
    status() {
      return 'ready';
    }
  }

  await withCoreApplication(async ({request, resolve}) => {
    const controller = resolve(StatusController);
    const response = await request('/status');
    expect(response.status).toBe(201);
    expect(await response.text()).toBe('ready');
    expect(controller).toBeInstanceOf(StatusController);
  }, {
    listen: true,
    config: {providers: [StatusController]},
  });
  ```
- **Options**:
  - `config`: Standard `ApplicationConfig` passed to the `Cheetah` constructor.
  - `listen`: `true` or a port number to start an HTTP server automatically (defaults to DI-only setup when omitted).
  - `port`: Explicit port used when `listen` is truthy and not a number.
- **Guarantees**: Automatic injector bootstrapping, optional HTTP server lifecycle, ergonomic provider resolution, and consistent teardown.
