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
} from "../src";
import { withCoreApplication } from "../src/testing";

describe("HTTP server integration tests", () => {
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
        console.log(payload.device);
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
});
