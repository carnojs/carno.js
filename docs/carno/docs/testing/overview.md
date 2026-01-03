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

TODO: Document `TestingHelper` for HTTP testing.
