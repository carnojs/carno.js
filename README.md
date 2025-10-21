# Cheetah.js

A fast, modern, and lightweight object-oriented framework for Bun with TypeScript support.

## Features

- Built for Bun runtime
- Decorator-based architecture
- Dependency injection with multiple scopes
- Built-in validation with class-validator
- Flexible middleware system
- Integrated logging with Pino
- Built-in caching system
- TypeScript first

## Packages

This monorepo contains the following packages:

- **[@cheetah.js/core](./packages/core)** - Core framework with routing, DI, and middleware
- **[@cheetah.js/orm](./packages/orm)** - Lightweight ORM with migrations support
- **[@cheetah.js/schedule](./packages/schedule)** - Task scheduling with cron support

## Installation

```bash
bun install @cheetah.js/core
```

### TypeScript Configuration

Your `tsconfig.json` must include:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## Quick Start

```typescript
import { Cheetah } from '@cheetah.js/core';

new Cheetah().listen();
```

## Controllers and Routes

Controllers handle HTTP requests. Use decorators to define routes:

```typescript
import { Controller, Get, Post, Param, Body } from '@cheetah.js/core';

@Controller()
export class UserController {
  @Get('/')
  list() {
    return { users: [] };
  }

  @Get(':id')
  show(@Param('id') id: string) {
    return { id, name: 'User' };
  }

  @Post()
  create(@Body() data: CreateUserDto) {
    return { message: 'User created' };
  }
}

new Cheetah({
  providers: [UserController]
}).listen();
```

### Nested Controllers

Organize routes with nested controllers:

```typescript
@Controller({
  children: [UserController, PostController]
})
export class ApiController {
  @Get('/')
  index() {
    return { api: 'v1' };
  }
}
```

Middleware from parent controllers are inherited by children (except route-specific middleware).

## Validation

Automatic request validation using class-validator:

```typescript
import { IsString, IsEmail, MinLength } from 'class-validator';
import { Controller, Post, Body } from '@cheetah.js/core';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsEmail()
  email: string;
}

@Controller()
export class UserController {
  @Post()
  create(@Body() user: CreateUserDto) {
    return `Hello ${user.name}!`;
  }
}
```

Configure validator options:

```typescript
new Cheetah({
  validator: {
    whitelist: true,
    forbidNonWhitelisted: true
  }
}).listen();
```

## Dependency Injection

Define services with different scopes:

```typescript
import { Service } from '@cheetah.js/core';

@Service()
export class UserService {
  findAll() {
    return [];
  }
}

@Controller()
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  list() {
    return this.userService.findAll();
  }
}
```

### Available Scopes

- **Singleton** (default) - Single instance
- **Request** - New instance per request
- **Instance** - New instance every time

```typescript
@Service({ scope: 'request' })
export class RequestService {
  // New instance per HTTP request
}
```

## Middleware

Process requests before they reach routes:

```typescript
import { Service, CheetahMiddleware, Context, CheetahClosure } from '@cheetah.js/core';

@Service()
export class AuthMiddleware implements CheetahMiddleware {
  handle(context: Context, next: CheetahClosure) {
    const token = context.headers.authorization;

    if (!token) {
      throw new HttpException('Unauthorized', 401);
    }

    next();
  }
}

@Middleware(AuthMiddleware)
@Controller()
export class ProtectedController {
  @Get('/')
  index() {
    return 'Protected route';
  }
}
```

Apply middleware to specific routes:

```typescript
@Controller()
export class UserController {
  @Middleware(AuthMiddleware)
  @Get('/profile')
  profile() {
    return 'User profile';
  }
}
```

## Logging

Built-in logger service using Pino:

```typescript
import { Controller, LoggerService } from '@cheetah.js/core';

@Controller()
export class HomeController {
  constructor(private logger: LoggerService) {}

  @Get('/')
  index() {
    this.logger.info('Request received');
    return 'Hello World!';
  }
}

new Cheetah({
  logger: { level: 'info' }
}).listen();
```

Custom logger:

```typescript
new Cheetah()
  .useLogger(CustomLoggerService)
  .listen();
```

## Caching

Simple caching with BentoCache:

```typescript
import { Service, CachePort } from '@cheetah.js/core';

@Service()
export class UserService {
  constructor(private cache: CachePort) {}

  async getUser(id: string) {
    const cached = await this.cache.get(`user:${id}`);

    if (cached) {
      return cached;
    }

    const user = { id, name: 'John' };
    await this.cache.set(`user:${id}`, user, { ttl: 3600 });

    return user;
  }
}
```

Custom cache driver:

```typescript
import { CachePort, Service } from '@cheetah.js/core';

@Service({ provide: CachePort })
export class RedisCache implements CachePort {
  async get(key: string) {
    // Redis implementation
  }

  async set(key: string, value: any, options?: any) {
    // Redis implementation
  }
}
```

## Available Decorators

### Route Decorators
- `@Controller()` - Define controller class
- `@Get()` - HTTP GET method
- `@Post()` - HTTP POST method
- `@Put()` - HTTP PUT method
- `@Patch()` - HTTP PATCH method
- `@Delete()` - HTTP DELETE method

### Parameter Decorators
- `@Param()` - Route parameters
- `@Query()` - Query string parameters
- `@Body()` - Request body
- `@Header()` - Request headers
- `@Context()` - Full request context

### Other Decorators
- `@Service()` - Define injectable service
- `@Middleware()` - Apply middleware

## ORM

Cheetah.js includes a lightweight ORM with PostgreSQL support:

```bash
bun install @cheetah.js/orm
```

[View ORM documentation](./packages/orm/README.md)

## Scheduling

Schedule tasks with cron expressions:

```bash
bun install @cheetah.js/schedule
```

[View Schedule documentation](./packages/schedule/README.md)

## Contributing

Contributions are welcome! Please open issues and submit pull requests.

## License

MIT
