import { describe, expect, test } from "bun:test";
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Query,
  Param,
  Headers,
  Middleware,
  Locals,
  createParamDecorator,
} from "../src";
import { withCoreApplication } from "../src/testing";
import type { Context, CarnoClosure, CarnoMiddleware } from "../src";

describe("HTTP server integration tests", () => {
  const minifiedBodyResolver = (context: Context, data?: string) => {
    const body = context.body || {};

    if (data) {
      return body[data];
    }

    return body;
  };

  (minifiedBodyResolver as any).__carnoParamType = "body";
  minifiedBodyResolver.toString = () => "minified";

  const BodyMinified = createParamDecorator(minifiedBodyResolver);

  class PassMiddleware implements CarnoMiddleware {
    async handle(_context: Context, next: CarnoClosure): Promise<void> {
      await next();
    }
  }

  @Controller({ path: "/minified" })
  class MinifiedBodyController {
    @Post("/login")
    @Middleware(PassMiddleware)
    login(@BodyMinified() body: any) {
      return { selectedAnswer: body?.selectedAnswer };
    }
  }
  @Controller({ path: "/users" })
  class UserController {
    @Get()
    list(@Query() query: any) {
      const limit = query.limit || 10;

      return { users: [], limit };
    }

    @Get("/:id")
    findById(@Param("id") id: string) {
      return { id, name: "John Doe", email: "john@example.com" };
    }

    @Post()
    create(@Body() body: any) {
      return { id: "123", ...body };
    }

    @Put("/:id")
    update(@Param("id") id: string, @Body() body: any) {
      return { id, ...body, updated: true };
    }

    @Delete("/:id")
    remove(@Param("id") id: string) {
      return { id, deleted: true };
    }

    @Patch("/:id")
    partialUpdate(@Param("id") id: string, @Body() body: any) {
      return { id, ...body, patched: true };
    }
  }

  @Controller({ path: "/auth" })
  class AuthController {
    @Post("/login")
    login(@Body() credentials: any, @Headers() headers: any) {
      const userAgent = headers.get("user-agent");

      return {
        token: "mock-jwt-token",
        user: credentials.email,
        device: userAgent,
      };
    }

    @Post("/logout")
    logout(@Headers("authorization") auth: string) {
      return { success: true, token: auth };
    }
  }

  test("GET request returns list of users", async () => {
    await withCoreApplication(
      async ({ request }) => {
        const response = await request("/users");
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.users).toBeArray();
        expect(payload.limit).toBe(10);
      },
      {
        listen: true,
        config: { providers: [UserController] },
      }
    );
  });

  test("GET request with query parameters", async () => {
    await withCoreApplication(
      async ({ request }) => {
        const response = await request("/users", {
          method: "GET",
        });

        const text = await response.text();

        const payload = JSON.parse(text);

        expect(response.status).toBe(200);
        expect(payload.limit).toBe(10);
      },
      {
        listen: true,
        config: { providers: [UserController] },
      }
    );
  });

  test("GET request with path parameter", async () => {
    await withCoreApplication(
      async ({ request }) => {
        const response = await request("/users/456");
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.id).toBe("456");
        expect(payload.name).toBe("John Doe");
        expect(payload.email).toBe("john@example.com");
      },
      {
        listen: true,
        config: { providers: [UserController] },
      }
    );
  });

  test("POST request creates user", async () => {
    await withCoreApplication(
      async ({ request }) => {
        const userData = {
          name: "Jane Smith",
          email: "jane@example.com",
        };

        const response = await request("/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userData),
        });

        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.id).toBe("123");
        expect(payload.name).toBe("Jane Smith");
        expect(payload.email).toBe("jane@example.com");
      },
      {
        listen: true,
        config: { providers: [UserController] },
      }
    );
  });

  test("PUT request updates user", async () => {
    await withCoreApplication(
      async ({ request }) => {
        const updateData = {
          name: "Jane Updated",
          email: "jane.updated@example.com",
        };

        const response = await request("/users/789", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        });

        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.id).toBe("789");
        expect(payload.name).toBe("Jane Updated");
        expect(payload.updated).toBe(true);
      },
      {
        listen: true,
        config: { providers: [UserController] },
      }
    );
  });

  test("DELETE request removes user", async () => {
    await withCoreApplication(
      async ({ request }) => {
        const response = await request("/users/999", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });

        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.id).toBe("999");
        expect(payload.deleted).toBe(true);
      },
      {
        listen: true,
        config: { providers: [UserController] },
      }
    );
  });

  test("PATCH request partially updates user", async () => {
    await withCoreApplication(
      async ({ request }) => {
        const patchData = {
          email: "newemail@example.com",
        };

        const response = await request("/users/555", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patchData),
        });

        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.id).toBe("555");
        expect(payload.email).toBe("newemail@example.com");
        expect(payload.patched).toBe(true);
      },
      {
        listen: true,
        config: { providers: [UserController] },
      }
    );
  });

  test("POST request with headers", async () => {
    await withCoreApplication(
      async ({ request }) => {
        const credentials = {
          email: "user@test.com",
          password: "secret123",
        };

        const response = await request("/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "CarnoTest/1.0",
          },
          body: JSON.stringify(credentials),
        });

        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.token).toBe("mock-jwt-token");
        expect(payload.user).toBe("user@test.com");
        expect(payload.device).toContain("CarnoTest");
      },
      {
        listen: true,
        config: { providers: [AuthController] },
      }
    );
  });

  test("POST request with specific header parameter", async () => {
    await withCoreApplication(
      async ({ request }) => {
        const response = await request("/auth/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-token-xyz",
          },
          body: JSON.stringify({}),
        });

        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.success).toBe(true);
        expect(payload.token).toBe("Bearer test-token-xyz");
      },
      {
        listen: true,
        config: { providers: [AuthController] },
      }
    );
  });

  test("POST request parses body when decorator source is minified", async () => {
    await withCoreApplication(
      async ({ request }) => {
        const payload = {
          selectedAnswer: "she did",
          responseTime: 4,
        };

        const response = await request("/minified/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result.selectedAnswer).toBe("she did");
      },
      {
        listen: true,
        config: { providers: [MinifiedBodyController, PassMiddleware] },
      }
    );
  });

  test("Multiple controllers work together", async () => {
    await withCoreApplication(
      async ({ request }) => {
        const userResponse = await request("/users/123");
        const userPayload = await userResponse.json();

        const authResponse = await request("/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "test@test.com", password: "pass" }),
        });

        const authPayload = await authResponse.json();

        expect(userResponse.status).toBe(200);
        expect(userPayload.id).toBe("123");

        expect(authResponse.status).toBe(200);
        expect(authPayload.token).toBe("mock-jwt-token");
      },
      {
        listen: true,
        config: { providers: [UserController, AuthController] },
      }
    );
  });

  test("Dependency injection works in controllers", async () => {
    await withCoreApplication(
      async ({ request, resolve }) => {
        const userController = resolve<UserController>(UserController);
        const authController = resolve<AuthController>(AuthController);

        expect(userController).toBeInstanceOf(UserController);
        expect(authController).toBeInstanceOf(AuthController);

        const response = await request("/users");
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.users).toBeArray();
      },
      {
        listen: true,
        config: { providers: [UserController, AuthController] },
      }
    );
  });

  test("Server runs on random port when port is 0", async () => {
    await withCoreApplication(
      async ({ port, request }) => {
        expect(port).toBeGreaterThan(0);

        const response = await request("/users");

        expect(response.status).toBe(200);
      },
      {
        listen: true,
        config: { providers: [UserController] },
      }
    );
  });

  test("Server runs on specific port when provided", async () => {
    await withCoreApplication(
      async ({ port, request }) => {
        expect(port).toBe(4567);

        const response = await request("/users");

        expect(response.status).toBe(200);
      },
      {
        listen: 4567,
        config: { providers: [UserController] },
      }
    );
  });

  test("GET request with @Param, @Middleware and @Locals", async () => {
    class OptionalAuthMiddleware implements CarnoMiddleware {
      async handle(context: Context, next: CarnoClosure): Promise<void> {
        // Simulate optional authentication
        context.locals = { user: { id: "user-123" } };
        await next();
      }
    }

    @Controller({ path: "/courses" })
    class CourseController {
      @Get(":id")
      @Middleware(OptionalAuthMiddleware)
      async findOne(@Param("id") id: string, @Locals() locals: any) {
        const userId = locals.user?.id ?? null;
        
        return {
          courseId: id,
          userId: userId,
          name: "Test Course",
        };
      }
    }

    await withCoreApplication(
      async ({ request }) => {
        const response = await request("/courses/019b33a6-2afc-7079-8bbe-e5439bb2e94d");
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.courseId).toBe("019b33a6-2afc-7079-8bbe-e5439bb2e94d");
        expect(payload.userId).toBe("user-123");
        expect(payload.name).toBe("Test Course");
      },
      {
        listen: true,
        config: { providers: [CourseController, OptionalAuthMiddleware] },
      }
    );
  });

  test("Different param names in same position don't conflict", async () => {
    // This test prevents a regression where updateStore() didn't update param.names
    // causing param name conflicts when different routes shared the same tree node
    
    @Controller({ path: "/items" })
    class ItemController {
      @Get(":itemId")
      findItem(@Param("itemId") itemId: string) {
        return { type: "item", id: itemId };
      }
    }

    @Controller({ path: "/products" })
    class ProductController {
      @Get(":productId")
      @Middleware(PassMiddleware)
      findProduct(@Param("productId") productId: string) {
        return { type: "product", id: productId };
      }
    }

    await withCoreApplication(
      async ({ request }) => {
        // Test first route
        const itemResponse = await request("/items/item-123");
        const itemPayload = await itemResponse.json();
        
        expect(itemResponse.status).toBe(200);
        expect(itemPayload.type).toBe("item");
        expect(itemPayload.id).toBe("item-123");

        // Test second route with different param name
        const productResponse = await request("/products/product-456");
        const productPayload = await productResponse.json();
        
        expect(productResponse.status).toBe(200);
        expect(productPayload.type).toBe("product");
        expect(productPayload.id).toBe("product-456");
      },
      {
        listen: true,
        config: { providers: [ItemController, ProductController, PassMiddleware] },
      }
    );
  });
});
