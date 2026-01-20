<p align="center">
  <img src="carno.png" width="200" alt="Carno.js Logo" />
</p>

<h1 align="center">Carno.js</h1>

<p align="center">
  <strong>Ultra-Fast, Performance-First Framework for Bun</strong>
</p>

<p align="center">
  <a href="https://carnojs.github.io/carno.js">Documentation</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#features">Features</a> •
  <a href="#examples">Examples</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/234k%20req%2Fs-⚡%20Fastest%20Bun%20Framework-f59e0b?style=for-the-badge&labelColor=1a1a1a" alt="234k requests per second" />
</p>

---

## ⚡ Performance

Carno.js is the **fastest framework for Bun** — benchmarked and proven.

| Framework | Requests/sec | Avg Latency | Result |
|:----------|:------------:|:-----------:|:------:|
| **Carno.js** | **234,562** | **0.21 ms** | 🥇 |
| Elysia | 167,206 | 0.29 ms | 🥈 |

> 📊 **40% faster** than the competition. [See full benchmark →](https://carnojs.github.io/carno.js/docs/benchmark)

---

## Why Carno.js?

Carno.js is built from the ground up for the **Bun** runtime. It focuses on raw performance, modularity, and a developer experience that feels natural for TypeScript engineers.

- 🚀 **Bun Native** - Leverages Bun's high-performance HTTP server and native APIs
- 🧱 **Plugin Architecture** - Highly modular. Build your app as a collection of independent, reusable modules
- 💉 **Powerful DI** - Robust Dependency Injection with multiple scopes (Singleton, Request, Instance)
- ✨ **Decorator-Based** - Clean, expressive API using TypeScript decorators
- 🔒 **Type-Safe Validation** - Zod-first validation with Valibot adapter available
- 🌐 **Built-in CORS** - Zero-config CORS support with fine-grained control
- ⚡ **JIT Compiled Handlers** - Routes compiled at startup for zero runtime overhead

## Ecosystem

| Package | Description |
| :--- | :--- |
| **@carno.js/core** | Core framework: Routing, DI, Middleware, Validation, CORS, Lifecycle |
| **@carno.js/orm** | Lightweight ORM for PostgreSQL and MySQL |
| **@carno.js/queue** | Background job processing via BullMQ |
| **@carno.js/schedule** | Cron, Interval, and Timeout task scheduling |
| **@carno.js/static** | High-performance static file serving |
| **@carno.js/cli** | Command Line Interface for migrations and tools |

## Quick Start

### Installation

<table>
  <tr>
    <th>macOS / Linux</th>
    <th>Windows (Bun)</th>
  </tr>
  <tr>
    <td><pre><code>bun add @carno.js/core</code></pre></td>
    <td><pre><code>bun add "@carno.js/core"</code></pre></td>
  </tr>
</table>

### Configuration

Ensure your `tsconfig.json` has decorators enabled:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

### Hello World

```typescript
import { Carno, Controller, Get } from '@carno.js/core';

@Controller()
class AppController {
  @Get('/')
  hello() {
    return { message: 'Hello from Carno.js!' };
  }
}

const app = new Carno();
app.controllers([AppController]);
app.listen(3000);
```

## Features

### HTTP Methods & Routing

```typescript
import { Controller, Get, Post, Put, Delete, Param, Query, Body } from '@carno.js/core';

@Controller('/users')
class UserController {
  @Get()
  list() {
    return { users: [] };
  }

  @Get('/:id')
  findOne(@Param('id') id: string) {
    return { id };
  }

  @Post()
  create(@Body() body: CreateUserDto) {
    return { created: true, data: body };
  }

  @Put('/:id')
  update(@Param('id') id: string, @Body() body: UpdateUserDto) {
    return { updated: true, id };
  }

  @Delete('/:id')
  remove(@Param('id') id: string) {
    return { deleted: true, id };
  }
}
```

### Parameter Decorators

| Decorator | Description |
| :--- | :--- |
| `@Param(key?)` | Route parameters (e.g., `/users/:id`) |
| `@Query(key?)` | Query string parameters |
| `@Body(key?)` | Request body (parsed JSON) |
| `@Header(key?)` | Request headers |
| `@Req()` | Raw Request object |
| `@Ctx()` | Full Context object |

### Dependency Injection

```typescript
import { Service, Controller, Get } from '@carno.js/core';

@Service()
class UserService {
  findAll() {
    return ['Alice', 'Bob'];
  }
}

@Controller('/users')
class UserController {
  constructor(private userService: UserService) {}

  @Get()
  list() {
    return this.userService.findAll();
  }
}

const app = new Carno();
app.services([UserService]);
app.controllers([UserController]);
app.listen(3000);
```

#### DI Scopes

```typescript
import { Service, Scope } from '@carno.js/core';

// Singleton (default) - same instance always
@Service()
class SingletonService {}

// Instance - new instance per injection
@Service({ scope: Scope.INSTANCE })
class InstanceService {}

// Request - new instance per HTTP request
@Service({ scope: Scope.REQUEST })
class RequestService {}
```

### Validation with Zod

```typescript
import { z } from 'zod';
import { Controller, Post, Body, Schema, ZodAdapter } from '@carno.js/core';

@Schema(z.object({
  name: z.string().min(2),
  email: z.string().email(),
}))
class CreateUserDto {
  name!: string;
  email!: string;
}

@Controller('/users')
class UserController {
  @Post()
  create(@Body() body: CreateUserDto) {
    return { created: true, user: body };
  }
}

const app = new Carno({ validation: new ZodAdapter() });
app.controllers([UserController]);
app.listen(3000);
```

Invalid payloads automatically return a `400 Bad Request` with detailed error messages.

### CORS

```typescript
const app = new Carno({
  cors: {
    origins: '*',                    // or 'http://example.com' or ['http://a.com', 'http://b.com']
    methods: ['GET', 'POST'],        // Allowed methods
    headers: ['Content-Type'],       // Allowed headers
    credentials: true,               // Allow credentials
    maxAge: 86400,                   // Preflight cache in seconds
  }
});
```

### Middleware

```typescript
import { Controller, Get, Middleware, Context } from '@carno.js/core';
import type { MiddlewareHandler } from '@carno.js/core';

const authMiddleware: MiddlewareHandler = (ctx: Context) => {
  const token = ctx.req.headers.get('authorization');
  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }
  ctx.locals.user = { id: '123' };
};

@Controller('/admin')
@Middleware(authMiddleware)
class AdminController {
  @Get()
  dashboard(ctx: Context) {
    return { user: ctx.locals.user };
  }
}
```

### Global Middleware

```typescript
const app = new Carno({
  globalMiddlewares: [
    loggerMiddleware,
    authMiddleware,
  ]
});
```

### Lifecycle Hooks

```typescript
import { Service, OnApplicationInit, OnApplicationBoot, OnApplicationShutdown } from '@carno.js/core';

@Service()
class DatabaseService {
  @OnApplicationInit()
  async onInit() {
    console.log('Connecting to database...');
  }

  @OnApplicationBoot()
  onBoot() {
    console.log('Application started!');
  }

  @OnApplicationShutdown()
  async onShutdown() {
    console.log('Closing connections...');
  }
}
```

### HTTP Exceptions

```typescript
import { 
  HttpException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException
} from '@carno.js/core';

@Get('/:id')
findOne(@Param('id') id: string) {
  if (!id) {
    throw new BadRequestException('ID is required');
  }
  
  const user = this.userService.find(id);
  if (!user) {
    throw new NotFoundException('User not found');
  }
  
  return user;
}
```

### Plugins & Modules

```typescript
// user.module.ts
import { Carno } from '@carno.js/core';

export const UserModule = new Carno({
  exports: [UserService],
});
UserModule.controllers([UserController]);
UserModule.services([UserService, UserRepository]);

// app.ts
import { UserModule } from './user.module';

const app = new Carno();
app.use(UserModule);
app.listen(3000);
```

### Testing

```typescript
import { describe, expect, test } from 'bun:test';
import { Controller, Get, Service } from '@carno.js/core';
import { withTestApp } from '@carno.js/core';

@Service()
class GreetService {
  greet(name: string) {
    return `Hello, ${name}!`;
  }
}

@Controller('/greet')
class GreetController {
  constructor(private greetService: GreetService) {}

  @Get('/:name')
  greet(@Param('name') name: string) {
    return { message: this.greetService.greet(name) };
  }
}

describe('GreetController', () => {
  test('greets by name', async () => {
    await withTestApp(
      async (harness) => {
        const response = await harness.get('/greet/World');
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ message: 'Hello, World!' });
      },
      {
        controllers: [GreetController],
        services: [GreetService],
        listen: true,
      }
    );
  });
});
```

## API Reference

### Carno Class

```typescript
const app = new Carno(config?: CarnoConfig);

// Register controllers (accepts array)
app.controllers([UserController, ProductController]);

// Register services (accepts array)
app.services([UserService, { token: Logger, useClass: ConsoleLogger }]);

// Register global middlewares (accepts array)
app.middlewares([authMiddleware, loggerMiddleware]);

// Use a plugin/module
app.use(PluginModule);

// Start the server
await app.listen(3000);  // Returns Promise<void>

// Stop the server
await app.stop();
```

### CarnoConfig

```typescript
interface CarnoConfig {
  exports?: (Token | ProviderConfig)[];           // Services to export from plugin
  globalMiddlewares?: MiddlewareHandler[];        // Global middleware chain
  disableStartupLog?: boolean;                    // Disable startup banner
  cors?: CorsConfig;                              // CORS configuration
  validation?: ValidatorAdapter | boolean;        // Validation adapter (ZodAdapter, ValibotAdapter)
  cache?: CacheConfig | boolean;                  // Cache configuration
}
```

### Context

```typescript
class Context {
  req: Request;                    // Original Bun Request
  params: Record<string, string>;  // Route parameters
  query: Record<string, string>;   // Query parameters
  body: any;                       // Parsed request body
  locals: Record<string, any>;     // Request-scoped data (for middleware)

  async parseBody(): Promise<any>; // Parse JSON body
  json(data: any, status?: number): Response;
  text(data: string, status?: number): Response;
}
```

## Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.
