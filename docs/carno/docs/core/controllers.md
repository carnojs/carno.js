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

Carno.js supports multiple response types out of the box. You can return objects, strings, or full `Response` objects.

### JSON Response
By default, if you return an object or array, Carno.js serializes it to JSON and sets `Content-Type: application/json`.

```ts
@Get()
findAll() {
  return { data: [] };
}
```

### Text Response
Returning a string sends a `text/plain` response.

```ts
@Get('/health')
health() {
  return 'OK';
}
```

### No Content Response
Returning `undefined` or `void` sends a `204 No Content` response.

```ts
@Delete('/:id')
delete(@Param('id') id: string) {
  // Delete logic...
  // Returns 204 No Content
}
```

### Response Object
You can return a native `Response` object for full control.

```ts
@Get()
custom() {
  return new Response('Custom', { status: 201 });
}
```

### Context Response Helpers

For more control over responses, use the `Context` object and its helper methods:

```ts
import { Controller, Get, Ctx, Context } from '@carno.js/core';

@Controller('/api')
class ApiController {
  // JSON with custom status
  @Post('/users')
  create(@Ctx() ctx: Context, @Body() data: any) {
    return ctx.json({ id: 1, ...data }, 201);
  }

  // Plain text
  @Get('/health')
  health(@Ctx() ctx: Context) {
    return ctx.text('OK');
  }

  // HTML response
  @Get('/page')
  page(@Ctx() ctx: Context) {
    return ctx.html('<h1>Hello World</h1>');
  }

  // Redirect
  @Get('/old')
  redirect(@Ctx() ctx: Context) {
    return ctx.redirect('/new', 301);
  }
}
```

| Method | Description |
| :--- | :--- |
| `ctx.json(data, status?)` | Returns JSON with `application/json` content type |
| `ctx.text(data, status?)` | Returns plain text with `text/plain` content type |
| `ctx.html(data, status?)` | Returns HTML with `text/html` content type |
| `ctx.redirect(url, status?)` | Returns a redirect response (default: 302) |

:::tip
For detailed documentation on the Context object and all response helpers, see the [Context documentation](./context.md).
:::
