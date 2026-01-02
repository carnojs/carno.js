---
sidebar_position: 2
---

# Controllers & Routing

Controllers responsible for handling incoming HTTP requests and returning responses. They are defined using classes and decorators.

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

### Object Options Syntax

For advanced configurations (scope, nested controllers), use the object syntax:

```ts
import { Controller, Get, ProviderScope } from '@carno.js/core';

@Controller({
  path: '/users',
  scope: ProviderScope.REQUEST
})
export class UserController {
  
  @Get()
  findAll() {
    return 'This action returns all users';
  }
}
```

Both syntaxes are equivalent when you only need to specify a path. Use the object syntax when you need additional options like `scope` or `children`.

### Lifecycle

Controllers are singleton by default and are pre-instantiated at startup for faster first request handling. If a controller is marked as `ProviderScope.REQUEST` or depends on any request-scoped provider, it becomes request-scoped and is instantiated per request.

To register the controller, add it to the `providers` list in your application configuration.

```ts
new Carno({
  providers: [UserController]
}).listen();
```

## Route Methods

Carno.js supports standard HTTP methods via decorators:

- `@Get(path?)`
- `@Post(path?)`
- `@Put(path?)`
- `@Delete(path?)`
- `@Patch(path?)`

The `path` argument is optional. If omitted, the route corresponds to the controller's base path.

```ts
@Controller('/cats')
export class CatsController {
  @Post()
  create() {
    return 'This action adds a new cat';
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return `This action returns a #${id} cat`;
  }
}
```

## Request Parameters

Use decorators to access request data.

| Decorator | Description | Example |
| :--- | :--- | :--- |
| `@Body(key?)` | Request body (JSON/Form) | `@Body() body` or `@Body('name') name` |
| `@Query(key?)` | Query string parameters | `@Query() q` or `@Query('limit') limit` |
| `@Param(key?)` | Route parameters | `@Param() params` or `@Param('id') id` |
| `@Headers(key?)` | Request headers | `@Headers() headers` or `@Headers('authorization') token` |
| `@Req()` | The raw `Request` object | `@Req() req` |
| `@Context()` | The framework `Context` object | `@Context() ctx` |
| `@Locals()` | Request-scoped locals | `@Locals() locals` |

### Example

```ts
@Post(':id')
update(
  @Param('id') id: string,
  @Body() updateUserDto: UpdateUserDto,
  @Query('verbose') verbose: string
) {
  return { id, ...updateUserDto, verbose };
}
```

## Nested Controllers (Routing Tree)

You can structure your application using nested controllers. This allows you to build a route tree where children inherit the path prefix of their parent.

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

**Note:** Middleware applied to a parent controller is inherited by its children.

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
Returning a string sends a text/html response.

### Response Object
You can return a native `Response` object for full control.

```ts
@Get()
custom() {
  return new Response('Custom', { status: 201 });
}
```

### Accessing Context
For more advanced scenarios (like setting cookies or status codes imperatively), access the `Context`.

```ts
@Get()
create(@Context() ctx: Context) {
  ctx.setResponseStatus(201);
  return 'Created';
}
```
