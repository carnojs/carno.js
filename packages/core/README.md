# @cheetah.js/core

Core framework for building web applications with Bun and TypeScript.

## Features

- Decorator-based routing
- Dependency injection with multiple scopes
- Built-in validation with class-validator
- Flexible middleware system
- Integrated logging with Pino
- Built-in caching system
- TypeScript first

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
  create(@Body() data: any) {
    return { message: 'User created' };
  }
}

new Cheetah({
  providers: [UserController]
}).listen();
```

### Nested Controllers

```typescript
@Controller({
  children: [UserController]
})
export class ApiController {
  @Get('/')
  index() {
    return { api: 'v1' };
  }
}
```

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
    return { name: user.name };
  }
}
```

Configure validator:

```typescript
new Cheetah({
  validator: {
    whitelist: true,
    forbidNonWhitelisted: true
  }
}).listen();
```

## Dependency Injection

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

### Scopes

- **Singleton** (default) - Single instance
- **Request** - New instance per request
- **Instance** - New instance every time

```typescript
@Service({ scope: 'request' })
export class RequestService {}
```

## Middleware

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
    return 'Protected';
  }
}
```

## Logging

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

## Caching

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
    // Implementation
  }

  async set(key: string, value: any, options?: any) {
    // Implementation
  }
}
```

## Available Decorators

### Route Decorators
- `@Controller()` - Define controller
- `@Get()` - HTTP GET
- `@Post()` - HTTP POST
- `@Put()` - HTTP PUT
- `@Patch()` - HTTP PATCH
- `@Delete()` - HTTP DELETE

### Parameter Decorators
- `@Param()` - Route parameters
- `@Query()` - Query parameters
- `@Body()` - Request body
- `@Header()` - Request headers
- `@Context()` - Request context

### Other Decorators
- `@Service()` - Injectable service
- `@Middleware()` - Apply middleware

## License

MIT
