---
sidebar_position: 8
---

# Lifecycle Events

Cheetah.js allows you to hook into key moments of the application lifecycle using decorators.

## Available Hooks

| Decorator | Trigger |
| :--- | :--- |
| `@OnApplicationInit()` | Called when the DI container initializes, before the server starts. |
| `@OnApplicationBoot()` | Called right after the application is fully bootstrapped. |
| `@OnApplicationShutdown()` | Called when the application receives a termination signal (`SIGTERM`, `SIGINT`). |

## Usage

Decorate any method in your `@Service` or `@Controller` classes.

### Execution Priority

All lifecycle decorators accept an optional `priority` parameter (default is `0`). Hooks with a **higher priority number** are executed first. This is crucial when one service depends on another being initialized first.

```ts
import { Service, OnApplicationInit } from '@cheetah.js/core';

@Service()
export class ConfigService {
  @OnApplicationInit(100) // Runs first
  async loadConfig() {
    console.log('Loading configuration...');
  }
}

@Service()
export class DatabaseService {
  @OnApplicationInit(50) // Runs after ConfigService
  async connect() {
    console.log('Connecting to database...');
  }
}
```

## Available Hooks

1. **Init**: Providers are loaded. `@OnApplicationInit` hooks run.
2. **Boot**: Server starts. `@OnApplicationBoot` hooks run.
3. **Runtime**: Requests are handled.
4. **Shutdown**: Signal received. `@OnApplicationShutdown` hooks run.