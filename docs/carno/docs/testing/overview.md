---
sidebar_position: 1
---

# Testing Overview

Testing is a first-class citizen in Carno.js. We provide utilities to make it easy to write unit and integration tests for your applications.

## Testing with the Database

When writing integration tests that involve the ORM, you need a clean database state for each test. The `withDatabase` helper simplifies this process by handling connection management, schema creation, and cleanup.

### Basic Usage

The `withDatabase` helper creates a temporary schema, runs your migrations (or provided SQL statements), and executes your test routine within an ORM session.

```typescript
import { withDatabase } from '@carno.js/orm/testing';
import { User } from '../entities/User';

describe('UserRepository', () => {
  it('should create a user', async () => {
    await withDatabase(async ({ orm }) => {
      const user = await User.create({
        name: 'John Doe',
        email: 'john@example.com'
      });

      expect(user.id).toBeDefined();
    });
  });
});
```

### Providing SQL Statements

You can provide an array of SQL statements to initialize the database schema manually if you don't want to rely on migrations.

```typescript
await withDatabase(
  [
    'CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT, email TEXT)'
  ],
  async ({ orm, executeSql }) => {
    // Your test logic here
    await executeSql("INSERT INTO users (name) VALUES ('Jane')");
  }
);
```

### Options

`withDatabase` accepts an options object to customize the connection and behavior.

```typescript
await withDatabase(
  async ({ orm }) => { /* ... */ },
  {
    schema: 'test_schema', // Custom schema name (default: public)
    entityFile: 'src/**/*.entity.ts', // Glob pattern to load entities
    connection: {
      host: 'localhost',
      // ... overrides for ConnectionSettings
    }
  }
);
```

### How it Works

1. **Schema Isolation**: For every call, it drops and recreates the specified schema (defaulting to `public`).
2. **Auto-Migrations**: If `migrationPath` is found in your `carno.config.ts` (or provided in options), it automatically loads and executes the SQL migration files.
3. **Session Context**: It wraps the execution in an `ormSessionContext`, so that Active Record methods and Repositories use the correct `Orm` instance.
4. **Cleanup**: Since it recreates the schema every time, each test starts with a completely fresh database.

## Testing Controllers

Carno ships a test harness for controller and HTTP testing. It creates a `Carno`
instance, registers controllers/services, and can start a real HTTP server so you
can call routes using `fetch`.

### Quick start with automatic cleanup

Use `withTestApp` when you want a small integration test and automatic cleanup.
It always calls `close()` even if your test throws.

```typescript
import { withTestApp, Controller, Get } from '@carno.js/core';

@Controller('/health')
class HealthController {
  @Get()
  health() {
    return { status: 'ok' };
  }
}

await withTestApp(
  async (harness) => {
    const response = await harness.get('/health');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  },
  {
    controllers: [HealthController],
    listen: true
  }
);
```

### Manual lifecycle control

Use `createTestHarness` when you need to keep the server open for multiple
assertions or want to set up extra state before closing.

```typescript
import { createTestHarness } from '@carno.js/core';

const harness = await createTestHarness({
  controllers: [HealthController],
  services: [],
  listen: true
});

try {
  const response = await harness.get('/health');
  expect(response.status).toBe(200);
} finally {
  await harness.close();
}
```

### Harness API overview

- `app`: The `Carno` instance you can configure directly.
- `container`: The internal DI container.
- `server` and `port`: Defined only when `listen` is enabled.
- `resolve(token)`: Resolve a service from the container.
- `request`, `get`, `post`, `put`, `delete`: HTTP helpers. `post` and `put`
  serialize JSON and set `Content-Type: application/json`.
- `close()`: Stops the server and cleans up.

### Options

- `controllers`: Controllers to register on the test app.
- `services`: Services or tokens to register in the DI container.
- `config`: `CarnoConfig` overrides for the test instance.
- `listen`: `true` to start a server on a random port, or a number to bind a
  specific port.
- `port`: Alternate way to set a specific port (used when `listen` is `true`).

### Notes

- If you do not set `listen`, the server will not start and HTTP helpers
  (`request`, `get`, `post`, `put`, `delete`) will throw.
- `request` accepts either a full URL or a path like `/health`.
