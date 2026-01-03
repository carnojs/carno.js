---
sidebar_position: 1
---

# ORM Overview

`@carno.js/orm` is a lightweight, Data Mapper-style ORM built for Bun. It supports PostgreSQL and MySQL.

## Why Carno ORM?

Unlike many other Node.js ORMs, Carno ORM **does not rely on external query builder kernels** (like Knex.js). instead, it is built directly on top of Bun's native `bun:sqlite` (compatible interfaces) and optimized drivers for PostgreSQL and MySQL. This architecture allows for raw performance, lower overhead, and zero legacy Node.js dependencies.

## Installation

```bash
bun install @carno.js/orm
```

## Configuration

Register the `CarnoOrm` plugin in your application.

```ts
import { Carno } from '@carno.js/core';
import { CarnoOrm } from '@carno.js/orm';

const app = new Carno()
  .use(CarnoOrm);

await app.listen(3000);
```

## Connection Settings

You need to provide connection settings via `carno.config.ts` in your project root or programmatically (though `carno.config.ts` is preferred for tools).

### carno.config.ts

```ts
import { ConnectionSettings, BunPgDriver } from '@carno.js/orm';

const config: ConnectionSettings = {
  driver: BunPgDriver, // or BunMysqlDriver
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'password',
  database: 'my_db',
  // Optional:
  migrationPath: './migrations',
};

export default config;
```

## Debugging SQL

Carno ORM does not have a specific `debug` flag in the connection settings. Instead, it utilizes the standard application logger. To see the executed SQL queries, set your application's logger level to `debug`.

```ts
const app = new Carno({
  logger: {
    level: 'debug'
  }
});
```