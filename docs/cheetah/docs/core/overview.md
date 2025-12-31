---
sidebar_position: 1
---

# Core Overview

The `@cheetah.js/core` package provides the fundamental building blocks of your application: the HTTP server, Dependency Injection container, and lifecycle management.

## The Cheetah Class

The `Cheetah` class is the entry point of your application. It bootstraps the server, initializes modules, and manages the dependency injection container.

```ts
import { Cheetah } from '@cheetah.js/core';

const app = new Cheetah({
  // Configuration options
});

await app.listen(3000);
```

## Configuration

You can pass an `ApplicationConfig` object to the constructor to configure the application behavior.

```ts
interface ApplicationConfig {
  /**
   * Options for class-validator
   */
  validation?: ValidatorOptions;

  /**
   * Options for the built-in Pino logger
   */
  logger?: pino.LoggerOptions;

  /**
   * Global providers to be registered in the root container
   */
  providers?: any[];

  /**
   * Providers exported by this module (used when creating plugins)
   */
  exports?: any[];

  /**
   * CORS configuration
   */
  cors?: CorsConfig;

  /**
   * Global middlewares applied to all routes
   */
  globalMiddlewares?: any[];
}
```

### CORS Configuration

Enable Cross-Origin Resource Sharing (CORS) by providing the `cors` object.

```ts
const app = new Cheetah({
  cors: {
    origins: ['https://example.com', 'http://localhost:3000'], // or '*' or RegExp or function
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 3600
  }
});
```

## Plugins & Modules

Cheetah.js uses a plugin system to extend functionality. Plugins are simply other `Cheetah` instances that export providers and middleware.

Use the `.use()` method to register a plugin.

```ts
import { CheetahOrm } from '@cheetah.js/orm';

app.use(CheetahOrm);
```

## Custom Logger

You can replace the default logger with your own implementation by using `.useLogger()`. The provider must implement `LoggerService`.

```ts
import { LoggerService } from '@cheetah.js/core';

class MyLogger extends LoggerService {
  // implementation
}

app.useLogger(MyLogger);
```

## Graceful Shutdown

The framework handles `SIGTERM` and `SIGINT` signals automatically to shut down the server and trigger the `OnApplicationShutdown` lifecycle hook.

```ts
// Manually close the server
app.close();
```