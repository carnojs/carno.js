---
sidebar_position: 1
---

# Core Overview

The `@carno.js/core` package provides the fundamental building blocks of your application: the HTTP server, Dependency Injection container, and lifecycle management.

## The Carno Class

The `Carno` class is the entry point of your application. It bootstraps the server, initializes modules, and manages the dependency injection container.

```ts
import { Carno } from '@carno.js/core';

const app = new Carno({
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
const app = new Carno({
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

Carno.js uses a plugin system to extend functionality. Plugins are simply other `Carno` instances that export providers and middleware.

Use the `.use()` method to register a plugin.

```ts
import { CarnoOrm } from '@carno.js/orm';

app.use(CarnoOrm);
```

## Custom Logger

You can replace the default logger with your own implementation by using `.useLogger()`. The provider must implement `LoggerService`.

```ts
import { LoggerService } from '@carno.js/core';

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