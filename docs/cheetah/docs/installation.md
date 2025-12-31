---
sidebar_position: 2
---

# Installation & Setup

Get your Cheetah.js application running in minutes.

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
bun install @cheetah.js/core
```

## Step 3: Configure TypeScript

Cheetah.js relies on experimental decorators. Ensure your `tsconfig.json` has the following compiler options:

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
import { Cheetah } from '@cheetah.js/core';

const app = new Cheetah();

await app.listen(3000);
```

Run it:

```bash
bun run src/index.ts
```

You should see: `Server running on port 3000`.

## Step 5: Add Modules (Optional)

Cheetah.js is modular. You can add ORM, Queue, and Schedule capabilities as plugins.

```bash
bun install @cheetah.js/orm @cheetah.js/queue @cheetah.js/schedule
```

Update your `src/index.ts` to use them:

```ts
import { Cheetah } from '@cheetah.js/core';
import { CheetahOrm } from '@cheetah.js/orm';
import { CheetahQueue } from '@cheetah.js/queue';
import { CheetahScheduler } from '@cheetah.js/schedule';

const app = new Cheetah()
  // Add ORM support
  .use(CheetahOrm)
  // Add Queue support with Redis connection
  .use(CheetahQueue({
    connection: { host: 'localhost', port: 6379 }
  }))
  // Add Scheduler support
  .use(CheetahScheduler);

await app.listen(3000);
```

## Project Structure

A typical Cheetah.js project structure looks like this:

```
my-app/
├── cheetah.config.ts     # Configuration (optional)
├── package.json
├── tsconfig.json
└── ...
```