---
sidebar_position: 9
---

# Migrations

Migrations allow you to evolve your database schema safely and share changes with your team.

## Configuration

Ensure your `carno.config.ts` has the `migrationPath` defined. This is where your migration files will be stored.

```ts
// carno.config.ts
import { ConnectionSettings, BunPgDriver } from '@carno.js/orm';

const config: ConnectionSettings = {
  driver: BunPgDriver,
  // ... connection details
  migrationPath: './src/migrations'
};

export default config;
```

## CLI Commands

Carno.js provides a built-in CLI via `bunx carno` to manage your migrations.

### Generating Migrations

Carno.js uses a **Schema Reflection** approach. When you generate a migration, the CLI scans your **Entity classes** and compares them with the current state of your database. It then creates a migration file containing the SQL necessary to make the database match your code.

```bash
bunx carno migration:generate
```

> **Note:** Your entities are the source of truth. Any change in a `@Property`, `@Index`, or Relationship will be detected and mirrored in the next generated migration.

### Running Migrations

To apply all pending migrations to your database:

```bash
bunx carno migration:run
```

## Best Practices

- Always review the generated migration files before running them.
- Commit your migration files to version control (Git).
- Run migrations as part of your CI/CD pipeline before deploying new code.
