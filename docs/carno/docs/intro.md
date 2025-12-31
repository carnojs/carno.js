---
sidebar_position: 1
---

# Introduction

Carno.js is a **performance-first framework and ORM** built for the Bun runtime.

It combines a small, expressive core with opt-in modules for data access, background jobs, and scheduling.
The framework relies heavily on TypeScript decorators to provide a declarative and clean API.

## Design Goals

- **Bun Native**: Built specifically to leverage Bun's HTTP server and runtime capabilities.
- **TypeScript First**: Decorators and strong typing are first-class citizens.
- **Modular**: The core is lightweight. You only install what you need (`@carno.js/orm`, `@carno.js/queue`, etc.).
- **Dependency Injection**: A robust DI container manages your application's components and scopes.

## Ecosystem

| Package | Description | Installation |
| :--- | :--- | :--- |
| **`@carno.js/core`** | The heart of the framework. HTTP server, DI, Middleware, Validation, Logging. | `bun install @carno.js/core` |
| **`@carno.js/orm`** | Lightweight Object-Relational Mapper for Postgres and MySQL. | `bun install @carno.js/orm` |
| **`@carno.js/queue`** | Background job processing powered by BullMQ. | `bun install @carno.js/queue` |
| **`@carno.js/schedule`** | Task scheduling (Cron, Interval, Timeout). | `bun install @carno.js/schedule` |

## Modularity & Clean Code

Carno.js is built with modularity in mind. Instead of a large monolithic configuration, you are encouraged to split your logic into independent **Plugins**. This keeps your codebase organized and your features decoupled.

```ts
// feature.module.ts
export const FeatureModule = new Carno({
  providers: [FeatureService, FeatureController]
});

// index.ts
import { FeatureModule } from './feature.module';

new Carno()
  .use(FeatureModule)
  .listen();
```

## Documentation Structure

- **Getting Started**: Installation and basic setup.
- **Core**: Deep dive into Controllers, Providers, Middleware, and the runtime lifecycle.
- **ORM**: Managing database connections, entities, relationships, and transactions.
- **Queue**: Handling asynchronous jobs and events.
- **Schedule**: Defining recurring tasks.
- **Testing**: Utilities for integration testing your application.