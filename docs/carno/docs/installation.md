---
sidebar_position: 2
---

# Installation & Setup

Get your Carno.js application running in minutes.

## Prerequisites

- **[Bun](https://bun.sh/)** (v1.0.0 or later)
- **TypeScript**

## Step 1: Initialize a new project

If you haven't already, create a new directory and initialize a Bun project:

```bash
mkdir my-app
cd my-app
bun init
```

## Step 2: Install Core

Install the core package:

```bash
bun install @carno.js/core
```

## Step 3: Configure TypeScript

Carno.js relies on experimental decorators. Ensure your `tsconfig.json` has the following compiler options:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## Step 4: Create your first application

Create a file named `src/index.ts`:

```ts
import { Carno } from '@carno.js/core';

const app = new Carno();

await app.listen(3000);
```

Run it:

```bash
bun run src/index.ts
```

You should see: `Server running on port 3000`.

## Step 5: Add Modules (Optional)

Carno.js is modular. You can add ORM, Queue, and Schedule capabilities as plugins.

```bash
bun install @carno.js/orm @carno.js/queue @carno.js/schedule
```

Update your `src/index.ts` to use them:

```ts
import { Carno } from '@carno.js/core';
import { CarnoOrm } from '@carno.js/orm';
import { CarnoQueue } from '@carno.js/queue';
import { CarnoScheduler } from '@carno.js/schedule';

const app = new Carno()
  // Add ORM support
  .use(CarnoOrm)
  // Add Queue support with Redis connection
  .use(CarnoQueue({
    connection: { host: 'localhost', port: 6379 }
  }))
  // Add Scheduler support
  .use(CarnoScheduler);

await app.listen(3000);
```

## Project Structure

A typical Carno.js project structure looks like this:

```
my-app/
├── carno.config.ts     # Configuration (optional)
├── package.json
├── tsconfig.json
└── ...
```