---
sidebar_position: 4
---

# Dependency Injection

Carno.js features a powerful, hierarchical Dependency Injection (DI) system managed by the internal `Container`.

## Defining Services

Use `@Service()` to make a class injectable.

```ts
import { Service } from '@carno.js/core';

@Service()
export class DatabaseService {
  async connect() { ... }
}
```

## Scopes

The framework supports three lifecycle scopes:

| Scope | Description |
| :--- | :--- |
| **Singleton** | (Default) Created once, shared across the entire application. |
| **Request** | Created fresh for each incoming HTTP request. Isolated state per request. |
| **Instance** | (Transient) Created fresh every time it is injected anywhere. |

```ts
import { Service, Scope } from '@carno.js/core';

@Service({ scope: Scope.REQUEST })
class RequestContext {
  userId: string;
}
```

### Scope Bubbling (Safety Rule)

A critical feature of the Carno DI system is **Scope Bubbling**. 

If a `Singleton` service injects a `Request` scoped service via its constructor, the Singleton service **automatically becomes Request-scoped** within that context.

This prevents common bugs where a Singleton holds a stale reference to a short-lived component from a previous request.

```ts
@Service({ scope: Scope.REQUEST })
class CurrentUser { ... }

@Service() // Defined as Singleton
class UserService {
  // Injects a Request-scoped dependency
  constructor(private user: CurrentUser) {}
}

// Result: UserService effectively behaves as Scope.REQUEST
```

## Registration

Register providers using the `.services()` method.

```ts
const app = new Carno();

app.services([
  DatabaseService,
  { token: 'API_KEY', useValue: 'secret' }, // Value provider
  { token: ILogger, useClass: ConsoleLogger } // Interface/Class substitution
]);
```

## Factory Providers

Currently, factories are managed via `useValue` (pre-computed) or `useClass`. Dynamic factories are planned for future versions.