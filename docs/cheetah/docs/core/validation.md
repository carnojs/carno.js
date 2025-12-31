---
sidebar_position: 3
---

# Validation

Cheetah.js includes built-in validation using [class-validator](https://github.com/typestack/class-validator) and [class-transformer](https://github.com/typestack/class-transformer).

Validation is automatically triggered when you use the `@Body()` decorator with a class type.

## defining a DTO (Data Transfer Object)

Create a class and decorate its properties with validation rules.

```ts
import { IsString, IsInt, Min, IsEmail } from 'class-validator';

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

## Using the DTO in a Controller

Simply type-hint the `@Body()` parameter with your DTO class.

```ts
import { Controller, Post, Body } from '@cheetah.js/core';
import { CreateUserDto } from './create-user.dto';

@Controller('/users')
export class UserController {
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    // If execution reaches here, createUserDto is valid
    // and is an instance of CreateUserDto
    return 'User created';
  }
}
```

## How it works

1. The framework detects that the argument type (`CreateUserDto`) is a class.
2. It uses `plainToInstance` to transform the raw JSON body into an instance of that class.
3. It runs `validateSync` on the instance.
4. If validation fails, it throws an `HttpException` with status `400` and the array of validation errors.
5. If successful, the controller method is invoked with the validated instance.

## Global Configuration

You can pass `ValidatorOptions` to the `Cheetah` constructor to configure the global validation behavior (e.g., stripping unknown properties).

```ts
new Cheetah({
  validation: {
    whitelist: true, // remove properties not decorated
    forbidNonWhitelisted: true, // throw error if unknown properties exist
    transform: true // automatically transform types
  }
}).listen();
```