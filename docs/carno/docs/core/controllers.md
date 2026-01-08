---
sidebar_position: 2
---

# Controllers & Routing

Controllers are responsible for handling incoming HTTP requests and returning responses. They are defined using classes and decorators.

## Defining a Controller

Use the `@Controller()` decorator to define a controller. You can specify an optional base path.

### Simple Path Syntax

For basic controllers, you can pass the path as a string directly:

```ts
import { Controller, Get } from '@carno.js/core';

@Controller('/users')
export class UserController {
  
  @Get()
  findAll() {
    return 'This action returns all users';
  }
}
```

### Registration

To register the controller, use the `.controllers()` method on your Carno app instance or module.

```ts
const app = new Carno();
app.controllers([UserController]);
app.listen(3000);
```

## Route Methods

Carno.js supports standard HTTP methods via decorators:

- `@Get(path?)`
- `@Post(path?)`
- `@Put(path?)`
- `@Delete(path?)`
- `@Patch(path?)`
- `@Head(path?)`
- `@Options(path?)`

The `path` argument is optional. If omitted, the route corresponds to the controller's base path.

```ts
@Controller('/cats')
export class CatsController {
  @Post()
  create() {
    return 'This action adds a new cat';
  }

  @Get('/:id')
  findOne(@Param('id') id: string) {
    return `This action returns a #${id} cat`;
  }
}
```

## Request Parameters

Use decorators to access request data.

| Decorator | Description | Example |
| :--- | :--- | :--- |
| `@Body(key?)` | Request body (JSON) | `@Body() body` or `@Body('name') name` |
| `@Query(key?)` | Query string parameters | `@Query() q` or `@Query('limit') limit` |
| `@Param(key?)` | Route parameters | `@Param() params` or `@Param('id') id` |
| `@Header(key?)` | Request headers | `@Header() headers` or `@Header('authorization') token` |
| `@Req()` | The raw `Request` object | `@Req() req` |
| `@Ctx()` | The full `Context` object | `@Ctx() ctx` |

### Example

```ts
import { Controller, Post, Param, Body, Query, Header } from '@carno.js/core';

@Controller('/users')
class UserController {
  @Post('/:id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Query('verbose') verbose: string,
    @Header('user-agent') userAgent: string
  ) {
    return { id, ...updateUserDto, verbose, userAgent };
  }
}
```

## Nested Controllers (Routing Tree)

You can structure your application using nested controllers. This allows you to build a route tree where children inherit the path prefix of their parent. Middleware applied to a parent controller is also inherited by its children.

```ts
@Controller({
  path: '/api',
  children: [UsersController, PostsController]
})
export class ApiController {}

@Controller('/users') // Final path: /api/users
export class UsersController {
  @Get()
  getAll() { ... }
}
```

## Responses

### JSON Response
By default, if you return an object or array, Carno.js serializes it to JSON and sets `Content-Type: application/json`.

```ts
@Get()
findAll() {
  return { data: [] };
}
```

### Text Response
Returning a string sends a text/plain response.

### Response Object
You can return a native `Response` object for full control.

```ts
@Get()
custom() {
  return new Response('Custom', { status: 201 });
}
```
