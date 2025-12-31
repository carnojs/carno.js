---
sidebar_position: 5
---

# Middleware

Middleware functions are executed before the route handler. They have access to the request `Context` and the `next` function.

## Creating Middleware

Implement the `CheetahMiddleware` interface. The class should be decorated with `@Service()` (or `@Injectable()`) so dependencies can be injected.

```ts
import { Service, CheetahMiddleware, Context, CheetahClosure } from '@cheetah.js/core';

@Service()
export class AuthMiddleware implements CheetahMiddleware {
  async handle(context: Context, next: CheetahClosure) {
    const token = context.headers.get('authorization');

    if (!token) {
      context.setResponseStatus(401);
      return; // Stop execution (don't call next)
    }

    // Pass control to the next middleware or route handler
    next();
  }
}
```

## Applying Middleware

### Controller Level

Apply middleware to all routes in a controller.

```ts
import { Middleware, Controller } from '@cheetah.js/core';
import { AuthMiddleware } from './auth.middleware';

@Controller()
@Middleware(AuthMiddleware)
export class UsersController {
  // ...
}
```

### Route Level

Apply middleware to a specific route.

```ts
import { Middleware, Get } from '@cheetah.js/core';

export class UsersController {
  @Get()
  @Middleware(AuthMiddleware)
  findAll() {
    return [];
  }
}
```

### Global Middleware

Apply middleware to every route in the application via the `Cheetah` configuration.

```ts
new Cheetah({
  globalMiddlewares: [AuthMiddleware],
  providers: [AuthMiddleware] // Don't forget to register the provider!
}).listen();
```

## Middleware Execution Order

1. **Global Middleware**: Executed first, in the order defined in the array.
2. **Controller Middleware**: Executed next.
3. **Route Middleware**: Executed last, before the handler.

## Dependency Injection in Middleware

Since middleware classes are providers, you can inject other services into them.

```ts
@Service()
export class LoggerMiddleware implements CheetahMiddleware {
  constructor(private logger: LoggerService) {}

  handle(context: Context, next: CheetahClosure) {
    this.logger.info(`Request to ${context.req.url}`);
    next();
  }
}
```