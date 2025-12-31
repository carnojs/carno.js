---
sidebar_position: 1
---

# ORM Overview

`@cheetah.js/orm` is a lightweight, Data Mapper-style ORM built for Bun. It supports PostgreSQL and MySQL.

## Why Cheetah ORM?

Unlike many other Node.js ORMs, Cheetah ORM **does not rely on external query builder kernels** (like Knex.js). instead, it is built directly on top of Bun's native `bun:sqlite` (compatible interfaces) and optimized drivers for PostgreSQL and MySQL. This architecture allows for raw performance, lower overhead, and zero legacy Node.js dependencies.

## Installation

```bash
bun install @cheetah.js/orm
```

## Configuration

Register the `CheetahOrm` plugin in your application.

```ts
import { Cheetah } from '@cheetah.js/core';
import { CheetahOrm } from '@cheetah.js/orm';

const app = new Cheetah()
  .use(CheetahOrm);

await app.listen(3000);
```

## Connection Settings

You need to provide connection settings via `cheetah.config.ts` in your project root or programmatically (though `cheetah.config.ts` is preferred for tools).

### cheetah.config.ts

```ts
import { ConnectionSettings, BunPgDriver } from '@cheetah.js/orm';

const config: ConnectionSettings = {
  driver: BunPgDriver, // or BunMysqlDriver
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'password',
  database: 'my_db',
  // Optional:
  migrationPath: './migrations',
  debug: true
};

export default config;
```