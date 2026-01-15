---
sidebar_position: 2
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

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

<Tabs groupId="os">
  <TabItem value="mac" label="macOS / Linux">
    ```bash
    bun install @carno.js/core
    ```
  </TabItem>
  <TabItem value="windows" label="Windows">
    ```bash
    bun install "@carno.js/core"
    ```
  </TabItem>
</Tabs>

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
import { Carno, Controller, Get } from '@carno.js/core';

@Controller()
class AppController {
  @Get()
  hello() {
    return 'Hello World';
  }
}

const app = new Carno();
app.controllers([AppController]);
await app.listen(3000);
```

Run it:

```bash
bun run src/index.ts
```

You should see: `Server running on port 3000`.

## Step 5: Add Modules (Optional)

Carno.js is modular. You can add ORM, Queue, Schedule, and CLI capabilities as plugins or dev tools.

<Tabs groupId="os">
  <TabItem value="mac" label="macOS / Linux">
    ```bash
    bun install @carno.js/orm @carno.js/queue @carno.js/schedule
    bun install -d @carno.js/cli
    ```
  </TabItem>
  <TabItem value="windows" label="Windows">
    ```bash
    bun install "@carno.js/orm" "@carno.js/queue" "@carno.js/schedule"
    bun install -d "@carno.js/cli"
    ```
  </TabItem>
</Tabs>

Update your `src/index.ts` to use them. For example, adding an ORM module:

```ts
import { Carno } from '@carno.js/core';
import { CarnoOrm } from '@carno.js/orm';

// Configure ORM Module (example)
// Usually you'd import a pre-configured module from another file
const ormModule = new Carno(); 
// ... configure ormModule ...

const app = new Carno();
app.use(CarnoOrm); // Use provided modules
app.listen(3000);
```

## Project Structure

A typical Carno.js project structure looks like this:

```
my-app/
├── src/
│   ├── modules/
│   │   └── user/
│   │       ├── user.controller.ts
│   │       ├── user.service.ts
│   │       ├── user.entity.ts
│   │       └── index.ts        # Exports UserModule
│   ├── index.ts                # Entry point
├── package.json
├── tsconfig.json
└── ...
```