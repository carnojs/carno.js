---
sidebar_position: 4
---

# Dependency Injection

Carno.js has a powerful Dependency Injection (DI) system that manages the instantiation and lifecycle of your classes.

## Creating a Service

To make a class available for injection, decorate it with `@Service()`.

```ts
import { Service } from '@carno.js/core';

@Service()
export class UserService {
  private users = [];

  findAll() {
    return this.users;
  }
}
```

## Injecting Dependencies

Dependencies are injected via the constructor. The framework resolves them by their type.

```ts
import { Controller, Get } from '@carno.js/core';
import { UserService } from './user.service';

@Controller('/users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  getAll() {
    return this.userService.findAll();
  }
}
```

## Registration

To make your services and controllers available to the container, you must register them. While you can register everything in the root `Carno` instance, it is highly recommended to use **Plugins** to organize your code into modules.

### Basic Registration

```ts
new Carno({
  providers: [UserService, UserController]
}).listen();
```

### Organized Registration (Using Plugins)

For a cleaner architecture, group related providers into a separate file and export them as a plugin.

```ts
// src/modules/user.module.ts
import { Carno } from '@carno.js/core';
import { UserService } from './user.service';
import { UserController } from './user.controller';

export const UserModule = new Carno({
  providers: [UserService, UserController],
  exports: [UserService] // Export services that other modules might need
});

// src/index.ts
import { Carno } from '@carno.js/core';
import { UserModule } from './modules/user.module';

const app = new Carno()
  .use(UserModule);

await app.listen(3000);
```

This approach allows you to build your application as a collection of independent, reusable modules.

## Scopes

You can control the lifecycle of a provider using the `scope` option in `@Service`.

```ts
import { Service, ProviderScope } from '@carno.js/core';

@Service({ scope: ProviderScope.REQUEST })
export class RequestContextService {}
```

| Scope | Enum | Description |
| :--- | :--- | :--- |
| **Singleton** | `ProviderScope.SINGLETON` | (Default) A single instance is created and shared across the application. |
| **Request** | `ProviderScope.REQUEST` | A new instance is created for each incoming HTTP request. |
| **Instance** | `ProviderScope.INSTANCE` | A new instance is created every time it is injected (Transient). |

## Custom Providers

You can define providers with custom tokens or factory functions.

### Value Provider

```ts
const configProvider = {
  provide: 'CONFIG',
  useValue: { port: 3000 }
};

new Carno({ providers: [configProvider] });
```

### Class Provider

```ts
const loggerProvider = {
  provide: LoggerService,
  useClass: CustomLogger
};
```

### Factory Provider (Not fully documented yet)
*Factory providers are currently handled internally or require specific setup.*

## Circular Dependencies

The framework resolves dependencies recursively. Avoid circular dependencies (A depends on B, B depends on A) as they can lead to runtime errors or stack overflows.