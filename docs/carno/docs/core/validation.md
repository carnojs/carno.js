---
sidebar_position: 3
---

# Validation

Carno.js provides a robust validation system integrated directly into the request pipeline.

## Default Behavior (Zod)

By default, **Zod** validation is enabled. You do **not** need to configure anything. Simply define your DTOs with `@Schema` and use them in your controllers.

```ts
import { z } from 'zod';
import { Schema, Controller, Post, Body } from '@carno.js/core';

// 1. Define Schema and DTO
const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

@Schema(CreateUserSchema)
class CreateUserDto {
  email!: string;
  password!: string;
}

// 2. Use in Controller
@Controller('/users')
class UserController {
  @Post()
  create(@Body() body: CreateUserDto) {
    // 'body' is guaranteed to be valid here
    return { success: true };
  }
}
```

If validation fails, the server automatically returns a `400 Bad Request` with error details.

## Valibot Support

Carno.js comes with a built-in adapter for **Valibot**.

### 1. Installation

You must install `valibot` in your project:

```bash
bun add valibot
```

### 2. Configuration

Pass the `ValibotAdapter` class to the configuration:

```ts
import { Carno, ValibotAdapter } from '@carno.js/core';

const app = new Carno({
  // Use the built-in Valibot adapter
  validation: ValibotAdapter
});
```

## Custom Validator Adapter

If you want to support another library (e.g. `class-validator`), you can create your own adapter by implementing the `ValidatorAdapter` interface.

You can also disable validation entirely:

```ts
const app = new Carno({
  validation: false
});
```
