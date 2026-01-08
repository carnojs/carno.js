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
  Header,
} from "../src";
import { withTestApp } from "../src/testing/TestHarness";
import type { Context, MiddlewareHandler } from "../src";

describe("HTTP server integration tests", () => {
  // Test controller with various HTTP methods and decorators
  @Controller("/users")
  class UserController {
    @Get()
    list() {
      return { users: ["Alice", "Bob"] };
    }

    @Get("/:id")
    getOne(@Param("id") id: string) {
      return { id, name: "User " + id };
    }

    @Post()
    create(@Body() body: any) {
      return { created: true, data: body };
    }

    @Put("/:id")
    update(@Param("id") id: string, @Body() body: any) {
      return { updated: true, id, data: body };
    }

    @Delete("/:id")
    remove(@Param("id") id: string) {
      return { deleted: true, id };
    }
  }

  @Controller("/search")
  class SearchController {
    @Get()
    search(@Query("q") query: string, @Query("page") page: string) {
      return { query, page: parseInt(page) || 1 };
    }
  }

  @Controller("/headers")
  class HeaderController {
    @Get()
    checkHeader(@Header("authorization") auth: string) {
      return { hasAuth: !!auth, auth };
    }
  }

  // HTTP Method Tests
  test("GET / returns list", async () => {
    await withTestApp(
      async (harness) => {
        const response = await harness.get("/users");
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ users: ["Alice", "Bob"] });
      },
      { controllers: [UserController], listen: true }
    );
  });

  test("GET /:id returns single user", async () => {
    await withTestApp(
      async (harness) => {
        const response = await harness.get("/users/123");
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ id: "123", name: "User 123" });
      },
      { controllers: [UserController], listen: true }
    );
  });

  test("POST creates resource with body", async () => {
    await withTestApp(
      async (harness) => {
        const response = await harness.post("/users", { name: "Charlie" });
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
          created: true,
          data: { name: "Charlie" },
        });
      },
      { controllers: [UserController], listen: true }
    );
  });

  test("PUT updates resource", async () => {
    await withTestApp(
      async (harness) => {
        const response = await harness.put("/users/456", { name: "Updated" });
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
          updated: true,
          id: "456",
          data: { name: "Updated" },
        });
      },
      { controllers: [UserController], listen: true }
    );
  });

  test("DELETE removes resource", async () => {
    await withTestApp(
      async (harness) => {
        const response = await harness.delete("/users/789");
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ deleted: true, id: "789" });
      },
      { controllers: [UserController], listen: true }
    );
  });

  // Query Parameter Tests
  test("Query parameters are parsed correctly", async () => {
    await withTestApp(
      async (harness) => {
        const response = await harness.get("/search?q=hello&page=2");
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ query: "hello", page: 2 });
      },
      { controllers: [SearchController], listen: true }
    );
  });

  // Header Tests
  test("Headers are accessible via decorator", async () => {
    await withTestApp(
      async (harness) => {
        const response = await harness.request("/headers", {
          headers: { authorization: "Bearer token123" },
        });
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
          hasAuth: true,
          auth: "Bearer token123",
        });
      },
      { controllers: [HeaderController], listen: true }
    );
  });

  // 404 Tests
  test("Non-existent route returns 404", async () => {
    await withTestApp(
      async (harness) => {
        const response = await harness.get("/non-existent");
        expect(response.status).toBe(404);
      },
      { controllers: [UserController], listen: true }
    );
  });
});
