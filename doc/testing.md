# Testing Helpers

## Database-focused tests

`withDatabase` from `@cheetah.js/orm/testing` is the primary entry point for high-throughput PostgreSQL integration tests. It eliminates boilerplate while keeping every run isolated and deterministic.

### Responsibilities

- Bootstraps the ORM with a production-like driver in under a millisecond.
- Creates the target schema (defaults to `public`), switches the search path, and drops the schema after each run.
- Runs arbitrary SQL statements or processes project migrations to provision tables.
- Exposes a lean `DatabaseTestContext` with `orm` and an `executeSql` helper that always returns `{rows}`.
- Scopes ORM and entity storage access with an async-local session to keep concurrent suites isolated.
- Caches sessions by connection, schema, and entity signature so new entities trigger a fresh setup.

### Call signatures

```ts
// Preferred: describe the routine first
await withDatabase(async (context) => {
  // ...
}, options?, statements?);

// Backward-compatible: provide seed statements up front
await withDatabase(statements, async (context) => {
  // ...
}, options?);
```

Both signatures resolve to the same execution path. The helper infers the correct argument order, so legacy suites continue to work without changes.

### Schema provisioning strategies

1. **Auto-discovered migrations**  
   - Pass `connection.migrationPath` to use explicit glob patterns.  
   - Omit `migrationPath` to let the helper read `cheetah.config.*` and extract the configured path automatically.

2. **Inline statements**  
   - Supply raw SQL strings in the `statements` array (either first or third parameter).  
   - Statements preserve ordering and run inside the same connection without extra transactions for speed.

When both approaches are available, migrations take priority. Inline statements only execute when no migrations were discovered.

### Runtime flow

1. Select logger: defaults to an `info` logger unless you pass `options.logger`.
2. Initialize the ORM with the resolved connection (`host`, `port`, credentials, and driver overrides are supported).
3. Prepare the schema and ensure the search path uses the requested schema.
4. Replay migration DDL or provided statements sequentially.
5. Execute the test routine. Use `executeSql` to send raw SQL in Given/When/Then form:

```ts
await withDatabase(async (context) => {
  // Given
  const beforeInsert = await context.executeSql(`SELECT COUNT(*)::int AS total FROM "accounts";`);

  // When
  await context.executeSql(`INSERT INTO "accounts" ("email") VALUES ('user@test.dev');`);
  const afterInsert = await context.executeSql(`SELECT COUNT(*)::int AS total FROM "accounts";`);

  // Then
  expect(beforeInsert.rows[0]?.total).toBe(0);
  expect(afterInsert.rows[0]?.total).toBe(1);
}, {
  schema: 'test_schema',
  connection: {migrationPath: 'apps/api/migrations/**/*.sql'},
});
```

6. Tear down: the helper truncates the schema via `DROP SCHEMA ... CASCADE; CREATE SCHEMA ...;` and disconnects the ORM.

This deterministic lifecycle keeps suites parallel-friendly and avoids cumulative test debt.

### Advanced configuration

- `schema`: Override the default schema name to isolate concurrent suites.
- `entityFile`: Load a specific entity registration file before executing queries.
- `logger`: Plug in a project logger to capture statements or timings.
- `connection`: Override any `ConnectionSettings` field (host, credentials, SSL, `migrationPath`, or custom `driver`).

Example with explicit statements and custom connection:

```ts
const TABLES = [
  `CREATE TABLE "courses" ("id" SERIAL PRIMARY KEY, "title" text NOT NULL);`,
];

await withDatabase(TABLES, async ({executeSql}) => {
  // When
  const result = await executeSql(`INSERT INTO "courses" ("title") VALUES ('Cheetah Mastery') RETURNING "id";`);

  // Then
  expect(result.rows).toHaveLength(1);
}, {
  schema: 'tenant_a',
  connection: {database: 'pg_test', username: 'ci_user', password: 'ci_pass'},
});
```

## Full application harness

The `@cheetah.js/core/testing` module provides an opinionated harness tailored for end-to-end HTTP flows and dependency resolution.

### `createCoreTestHarness(options)`

- Bootstraps a `Cheetah` application with the supplied `ApplicationConfig`.
- Starts an HTTP server when `listen` is `true` or a port number, and returns the actual port used.
- Accepts `plugins`, an array of `Cheetah` plugins or factories `() => Cheetah`, mirroring `app.use()` calls from production code.
- Returns an object containing:
  - `app`: the running `Cheetah` instance.
  - `injector`: access to the DI container.
  - `server` and `port`: useful when you need to assert bound ports.
  - `resolve(token)`: resolve providers or controllers directly from the injector.
  - `request(target, init)`: issue real HTTP calls; throws if `listen` is disabled to avoid false positives.
  - `close()`: shuts down both the injector and HTTP server, guaranteeing no dangling resources.

### `withCoreApplication(routine, options)`

- Wraps `createCoreTestHarness` with automatic setup and teardown.
- Ideal for concise Given/When/Then tests where the routine receives the prepared harness:

```ts
await withCoreApplication(async ({request, resolve}) => {
  // Given
  const controller = resolve(StatusController);

  // When
  const response = await request('/status');
  const payload = await response.text();

  // Then
  expect(response.status).toBe(201);
  expect(payload).toBe('ready');
  expect(controller).toBeInstanceOf(StatusController);
}, {
  listen: true,
  plugins: [CheetahOrm],
  config: {providers: [StatusController]},
});
```

- Plugins passed to `withCoreApplication` follow the same contract as `createCoreTestHarness`. Use this to register ORM, queue, or schedule plugins so the DI container matches runtime wiring.
- The helper resolves the plugins before initialization, ensuring lifecycle hooks fire during `app.init()`.

### Best practices

- Keep controllers and providers small to respect object calisthenics; prefer dedicated fixtures for bigger scenarios.
- Share configuration objects between tests for consistency, and override only what is required per scenario.
- Always call `close()` when using the harness manually to avoid port contention in watch mode.

These helpers strike a balance between speed and fidelity, enabling performance-oriented suites that exercise real infrastructure with minimal ceremony.
