import { describe, expect, test } from "bun:test";
import { Controller, Get, Post } from "../src";
import { withTestApp } from "../src/testing/TestHarness";

describe("CORS functionality", () => {
  @Controller("/api")
  class TestController {
    @Get("/users")
    getUsers() {
      return { users: ["Alice", "Bob"] };
    }

    @Post("/users")
    createUser() {
      return { id: 1, name: "Charlie" };
    }
  }

  test("CORS disabled by default - no CORS headers", async () => {
    await withTestApp(
      async (harness) => {
        const response = await harness.request("/api/users", {
          headers: { origin: "http://example.com" },
        });

        expect(response.status).toBe(200);
        expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
      },
      {
        listen: true,
        controllers: [TestController],
      }
    );
  });

  test("CORS enabled with wildcard - allows all origins", async () => {
    await withTestApp(
      async (harness) => {
        const response = await harness.request("/api/users", {
          headers: { origin: "http://any-site.com" },
        });

        expect(response.status).toBe(200);
        expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
      },
      {
        listen: true,
        controllers: [TestController],
        config: {
          cors: { origins: "*" },
        },
      }
    );
  });

  test("CORS enabled with single origin - allows matching origin", async () => {
    await withTestApp(
      async (harness) => {
        const response = await harness.request("/api/users", {
          headers: { origin: "http://example.com" },
        });

        expect(response.status).toBe(200);
        expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
          "http://example.com"
        );
      },
      {
        listen: true,
        controllers: [TestController],
        config: {
          cors: { origins: "http://example.com" },
        },
      }
    );
  });

  test("CORS enabled with single origin - blocks non-matching origin", async () => {
    await withTestApp(
      async (harness) => {
        const response = await harness.request("/api/users", {
          headers: { origin: "http://evil.com" },
        });

        expect(response.status).toBe(200);
        expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
      },
      {
        listen: true,
        controllers: [TestController],
        config: {
          cors: { origins: "http://example.com" },
        },
      }
    );
  });

  test("CORS with credentials enabled", async () => {
    await withTestApp(
      async (harness) => {
        const response = await harness.request("/api/users", {
          headers: { origin: "http://example.com" },
        });

        expect(response.status).toBe(200);
        expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
          "http://example.com"
        );
        expect(response.headers.get("Access-Control-Allow-Credentials")).toBe(
          "true"
        );
      },
      {
        listen: true,
        controllers: [TestController],
        config: {
          cors: {
            origins: "http://example.com",
            credentials: true,
          },
        },
      }
    );
  });
});
