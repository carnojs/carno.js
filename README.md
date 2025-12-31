<p align="center">
  <img src="carno.png" width="200" alt="Carno.js Logo" />
</p>

<h1 align="center">Carno.js</h1>

<p align="center">
  <strong>A fast, modern, and lightweight object-oriented framework for Bun with TypeScript support.</strong>
</p>

<p align="center">
  <a href="https://mlusca.github.io/carno.js">View Documentation</a>
</p>

---

## Why Carno.js?

Carno.js is built from the ground up for the **Bun** runtime. It focuses on raw performance, modularity, and a developer experience that feels natural for TypeScript engineers.

- 🚀 **Bun Native**: Leverages Bun's high-performance HTTP server and native APIs.
- 🧱 **Plugin-Based Architecture**: Highly modular. Build your app as a collection of independent, reusable modules.
- 💉 **Powerful DI**: Robust Dependency Injection container with multiple scopes (Singleton, Request, Instance).
- 🛠️ **Performance-First ORM**: A Data Mapper ORM that uses native Bun drivers directly, avoiding heavy query builders like Knex.js.
- ⚡ **Zero-Overhead References**: Handle circular dependencies between entities with zero runtime cost.
- 🔍 **Integrated Validation**: Automatic request validation using `class-validator` and `class-transformer`.

## Ecosystem

| Package | Description |
| :--- | :--- |
| [**@carno.js/core**](https://mlusca.github.io/carno.js/docs/core/overview) | Core framework: Routing, DI, Middleware, Lifecycle. |
| [**@carno.js/orm**](https://mlusca.github.io/carno.js/docs/orm/overview) | Lightweight ORM for PostgreSQL and MySQL. |
| [**@carno.js/queue**](https://mlusca.github.io/carno.js/docs/queue/overview) | Background job processing via BullMQ. |
| [**@carno.js/schedule**](https://mlusca.github.io/carno.js/docs/schedule/overview) | Cron, Interval, and Timeout task scheduling. |

## Quick Start

### 1. Installation

```bash
bun install @carno.js/core
```

### 2. Configuration

Ensure your `tsconfig.json` has decorators enabled:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

### 3. Create your Application

```typescript
import { Carno, Controller, Get } from '@carno.js/core';

@Controller()
class AppController {
  @Get('/')
  hello() {
    return { message: 'Hello from Carno.js!' };
  }
}

new Carno({
  providers: [AppController]
}).listen(3000);
```

## Modularity & Clean Code

Carno.js encourages you to organize your logic into **Plugins**. This keeps your features decoupled and easy to test.

```ts
// user.module.ts
export const UserModule = new Carno({
  providers: [UserService, UserController],
  exports: [UserService]
});

// index.ts
import { UserModule } from './user.module';

new Carno()
  .use(UserModule)
  .listen(3000);
```

## Documentation

For full guides, API references, and advanced usage, visit our documentation site:

👉 **[https://mlusca.github.io/carno.js](https://mlusca.github.io/carno.js)**

## Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.