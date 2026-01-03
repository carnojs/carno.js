---
sidebar_position: 3
---

# Validation

Carno.js validates request data through a **validation adapter**.  
By default, the framework uses **Zod** and validates classes only when you attach a Zod schema to them.  
If you prefer decorator-based validation, you can switch to the **class-validator** adapter.

This guide explains how each adapter works, when validation runs, and how to
configure it. It also includes a full walkthrough for creating a custom
adapter.

## Default adapter: Zod

Zod is the default adapter, so no extra configuration is required to enable it.  
Validation runs **only** when a DTO class has a Zod schema attached with `@ZodSchema`.

### Defining a Zod-validated DTO

```ts
import { z } from "zod";
import { ZodSchema } from "@carno.js/core";

const CreateUserSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  age: z.number().int().min(18),
});

@ZodSchema(CreateUserSchema)
export class CreateUserDto {
  name: string;
  email: string;
  age: number;
}
```

### Using the DTO in a Controller

```ts
import { Controller, Post, Body } from "@carno.js/core";
import { CreateUserDto } from "./create-user.dto";

@Controller("/users")
export class UserController {
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return "User created";
  }
}
```

### How Zod validation works

1. The framework detects the DTO class passed to `@Body()`.
2. It checks whether the class has a Zod schema attached via `@ZodSchema`.
3. If a schema exists, it runs `schema.safeParse` on the incoming body.
4. On failure, it throws an `HttpException` with status `400` and a structured list of validation issues.
5. On success, it returns the parsed data to your controller method.

## Optional adapter: class-validator + class-transformer

If you prefer decorator-based validation, you can use `ClassValidatorAdapter`.  
This adapter is **optional** and requires installing two peer dependencies:

```bash
npm install class-validator class-transformer
```

### Defining a class-validator DTO

```ts
import { IsString, IsInt, Min, IsEmail } from "class-validator";

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsInt()
  @Min(18)
  age: number;
}
```

### Enabling the class-validator adapter

```ts
import { Carno } from "@carno.js/core";
import { ClassValidatorAdapter } from "@carno.js/core";

const app = new Carno({
  validation: {
    adapter: ClassValidatorAdapter,
    options: {
      whitelist: true,
      forbidNonWhitelisted: true,
    },
  },
});
```

### How class-validator validation works

1. The framework detects that the argument type is a class.
2. It transforms the raw JSON body into an instance using `class-transformer`.
3. It validates the instance using `class-validator`.
4. On failure, it throws an `HttpException` with status `400` and a structured list of validation issues.
5. On success, the controller receives the validated class instance.

## Global Configuration

Validation is configured through the `validation` block.
When using Zod (default), the `options` object is reserved for future customization.
When using class-validator, `options` matches `ValidatorOptions`.

```ts
new Carno({
  validation: {
    adapter: ClassValidatorAdapter,
    options: {
      whitelist: true,
      forbidNonWhitelisted: true,
    },
  },
}).listen();
```

## Custom Validation Adapter

Carno.js allows you to plug in any validation library by implementing the
`ValidatorAdapter` interface. This is useful when you already have a preferred
validation stack or want full control over error formatting and transformations.

This section explains how to design a custom adapter, how Carno invokes it, and
how to configure it in the application.

### The ValidatorAdapter contract

An adapter is a small class that implements four methods:

- `hasValidation(target)` tells Carno whether a class is eligible for validation.
- `validateAndTransform(target, value)` validates the raw input and returns the
  transformed value (or throws an `HttpException` on failure).
- `getName()` returns a string for debugging/logging.
- `getOptions()` exposes adapter options.

The interface is intentionally minimal to keep validation fast and predictable.

### When the adapter runs

Carno only attempts validation when it sees a class type in request bindings
like `@Body()`. For performance, it calls `hasValidation()` first and caches the
result. If it returns `false`, validation is skipped for that class until the
cache changes.

### Example: A simple JSON schema adapter

Below is an example adapter that uses a pseudo JSON schema validator. It shows
the expected shape and error handling, not a real library.

```ts
import { HttpException, Metadata } from "@carno.js/core";
import type { ValidatorAdapter } from "@carno.js/core";

const JSON_SCHEMA = Symbol("json-schema");

export class JsonSchemaAdapter implements ValidatorAdapter {
  constructor(private options: { stopAtFirstError?: boolean } = {}) {}

  getName(): string {
    return "JsonSchemaAdapter";
  }

  getOptions() {
    return this.options;
  }

  hasValidation(target: Function): boolean {
    return Metadata.has(JSON_SCHEMA, target);
  }

  validateAndTransform(target: Function, value: any): any {
    const schema = Metadata.get(JSON_SCHEMA, target);

    if (!schema) {
      return value;
    }

    const result = validateJson(schema, value, this.options);

    if (!result.success) {
      throw new HttpException(result.issues, 400);
    }

    return result.data;
  }
}

function validateJson(schema: any, input: any, options: any) {
  // Replace with a real validator of your choice.
  return { success: true, data: input, issues: [] };
}
```

### Attaching metadata to DTOs

Your adapter decides how to detect validation metadata. A common approach is to
define a decorator that stores a schema on the DTO class.

```ts
import { Metadata } from "@carno.js/core";

const JSON_SCHEMA = Symbol("json-schema");

export function JsonSchema(schema: any): ClassDecorator {
  return (target: Function) => {
    Metadata.set(JSON_SCHEMA, schema, target);
  };
}
```

Usage:

```ts
@JsonSchema({
  type: "object",
  properties: {
    name: { type: "string", minLength: 3 },
    email: { type: "string", format: "email" },
  },
  required: ["name", "email"],
})
export class CreateUserDto {
  name: string;
  email: string;
}
```

### Enabling the adapter

Use the `validation` configuration block to register your adapter:

```ts
import { Carno } from "@carno.js/core";

const app = new Carno({
  validation: {
    adapter: JsonSchemaAdapter,
    options: {
      stopAtFirstError: true,
    },
  },
});
```

### Error formatting guidelines

`validateAndTransform` should throw an `HttpException` with status `400` and a
developer-friendly error payload. For consistency with built-in adapters:

- Return a list of issues with fields and messages.
- Avoid throwing raw library errors.
- Prefer stable shapes that are easy to map on the client side.

### Performance tips

- Keep `hasValidation` fast and deterministic.
- Do not perform validation inside loops; validate once per DTO.
- Use caching (Carno already caches `hasValidation` results).
- Avoid deep cloning unless required by your validator.

### Checklist

- Implement `ValidatorAdapter`.
- Decide how to detect validation metadata.
- Throw `HttpException` with status `400` on failure.
- Register the adapter in `validation.adapter`.
