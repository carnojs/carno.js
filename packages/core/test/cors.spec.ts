import { describe, expect, test } from "bun:test";
import { Controller, Get, Post } from "../src";
import { withCoreApplication } from "../src/testing";

describe("CORS functionality", () => {
  @Controller({ path: "/api" })
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
    await withCoreApplication(
      async ({ request }) => {
        const response = await request("/api/users", {
          headers: { origin: "http://example.com" },
        });

        expect(response.status).toBe(200);
        expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
      },
      {
        listen: true,
        config: { providers: [TestController] },
      }
    );
  });

  test("CORS enabled with single origin - allows matching origin", async () => {
    await withCoreApplication(
      async ({ request }) => {
        const response = await request("/api/users", {
          headers: { origin: "http://example.com" },
        });

        expect(response.status).toBe(200);
        expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
          "http://example.com"
        );
      },
      {
        listen: true,
        config: {
          providers: [TestController],
          cors: { origins: "http://example.com" },
        },
      }
    );
  });

  test("CORS enabled with single origin - blocks non-matching origin", async () => {
    await withCoreApplication(
      async ({ request }) => {
        const response = await request("/api/users", {
          headers: { origin: "http://evil.com" },
        });

        expect(response.status).toBe(200);
        expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
      },
      {
        listen: true,
        config: {
          providers: [TestController],
          cors: { origins: "http://example.com" },
        },
      }
    );
  });

  test("CORS enabled with wildcard - allows all origins", async () => {
    await withCoreApplication(
      async ({ request }) => {
        const response = await request("/api/users", {
          headers: { origin: "http://any-site.com" },
        });

        expect(response.status).toBe(200);
        expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
      },
      {
        listen: true,
        config: {
          providers: [TestController],
          cors: { origins: "*" },
        },
      }
    );
  });

  test("CORS enabled with multiple origins - allows matching origins", async () => {
    await withCoreApplication(
      async ({ request }) => {
        const response1 = await request("/api/users", {
          headers: { origin: "http://example.com" },
        });

        expect(response1.status).toBe(200);
        expect(response1.headers.get("Access-Control-Allow-Origin")).toBe(
          "http://example.com"
        );

        const response2 = await request("/api/users", {
          headers: { origin: "http://another.com" },
        });

        expect(response2.status).toBe(200);
        expect(response2.headers.get("Access-Control-Allow-Origin")).toBe(
          "http://another.com"
        );

        const response3 = await request("/api/users", {
          headers: { origin: "http://evil.com" },
        });

        expect(response3.status).toBe(200);
        expect(response3.headers.get("Access-Control-Allow-Origin")).toBeNull();
      },
      {
        listen: true,
        config: {
          providers: [TestController],
          cors: { origins: ["http://example.com", "http://another.com"] },
        },
      }
    );
  });

  test("CORS enabled with RegExp - matches pattern", async () => {
    await withCoreApplication(
      async ({ request }) => {
        const response1 = await request("/api/users", {
          headers: { origin: "http://app.example.com" },
        });

        expect(response1.status).toBe(200);
        expect(response1.headers.get("Access-Control-Allow-Origin")).toBe(
          "http://app.example.com"
        );

        const response2 = await request("/api/users", {
          headers: { origin: "http://api.example.com" },
        });

        expect(response2.status).toBe(200);
        expect(response2.headers.get("Access-Control-Allow-Origin")).toBe(
          "http://api.example.com"
        );

        const response3 = await request("/api/users", {
          headers: { origin: "http://evil.com" },
        });

        expect(response3.status).toBe(200);
        expect(response3.headers.get("Access-Control-Allow-Origin")).toBeNull();
      },
      {
        listen: true,
        config: {
          providers: [TestController],
          cors: { origins: /^http:\/\/.*\.example\.com$/ },
        },
      }
    );
  });

  test("CORS enabled with function - custom validation", async () => {
    await withCoreApplication(
      async ({ request }) => {
        const response1 = await request("/api/users", {
          headers: { origin: "http://allowed.com" },
        });

        expect(response1.status).toBe(200);
        expect(response1.headers.get("Access-Control-Allow-Origin")).toBe(
          "http://allowed.com"
        );

        const response2 = await request("/api/users", {
          headers: { origin: "http://blocked.com" },
        });

        expect(response2.status).toBe(200);
        expect(response2.headers.get("Access-Control-Allow-Origin")).toBeNull();
      },
      {
        listen: true,
        config: {
          providers: [TestController],
          cors: {
            origins: (origin: string) => origin.includes("allowed"),
          },
        },
      }
    );
  });

  test("CORS preflight request (OPTIONS) - returns 204 with headers", async () => {
    await withCoreApplication(
      async ({ request }) => {
        const response = await request("/api/users", {
          method: "OPTIONS",
          headers: {
            origin: "http://example.com",
            "Access-Control-Request-Method": "POST",
          },
        });

        expect(response.status).toBe(204);
        expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
          "http://example.com"
        );
        expect(response.headers.get("Access-Control-Allow-Methods")).toContain(
          "POST"
        );
      },
      {
        listen: true,
        config: {
          providers: [TestController],
          cors: { origins: "http://example.com" },
        },
      }
    );
  });

  test("CORS preflight request - blocks non-allowed origin", async () => {
    await withCoreApplication(
      async ({ request }) => {
        const response = await request("/api/users", {
          method: "OPTIONS",
          headers: {
            origin: "http://evil.com",
            "Access-Control-Request-Method": "POST",
          },
        });

        expect(response.status).toBe(403);
      },
      {
        listen: true,
        config: {
          providers: [TestController],
          cors: { origins: "http://example.com" },
        },
      }
    );
  });

  test("CORS with credentials enabled", async () => {
    await withCoreApplication(
      async ({ request }) => {
        const response = await request("/api/users", {
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
        config: {
          providers: [TestController],
          cors: {
            origins: "http://example.com",
            credentials: true,
          },
        },
      }
    );
  });

  test("CORS with custom methods", async () => {
    await withCoreApplication(
      async ({ request }) => {
        const response = await request("/api/users", {
          method: "OPTIONS",
          headers: {
            origin: "http://example.com",
            "Access-Control-Request-Method": "POST",
          },
        });

        expect(response.status).toBe(204);
        expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
          "GET, POST"
        );
      },
      {
        listen: true,
        config: {
          providers: [TestController],
          cors: {
            origins: "http://example.com",
            methods: ["GET", "POST"],
          },
        },
      }
    );
  });

  test("CORS with allowed headers", async () => {
    await withCoreApplication(
      async ({ request }) => {
        const response = await request("/api/users", {
          method: "OPTIONS",
          headers: {
            origin: "http://example.com",
            "Access-Control-Request-Method": "POST",
          },
        });

        expect(response.status).toBe(204);
        expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
          "Content-Type, Authorization"
        );
      },
      {
        listen: true,
        config: {
          providers: [TestController],
          cors: {
            origins: "http://example.com",
            allowedHeaders: ["Content-Type", "Authorization"],
          },
        },
      }
    );
  });

  test("CORS with exposed headers", async () => {
    await withCoreApplication(
      async ({ request }) => {
        const response = await request("/api/users", {
          headers: { origin: "http://example.com" },
        });

        expect(response.status).toBe(200);
        expect(response.headers.get("Access-Control-Expose-Headers")).toBe(
          "X-Custom-Header"
        );
      },
      {
        listen: true,
        config: {
          providers: [TestController],
          cors: {
            origins: "http://example.com",
            exposedHeaders: ["X-Custom-Header"],
          },
        },
      }
    );
  });

  test("CORS with maxAge", async () => {
    await withCoreApplication(
      async ({ request }) => {
        const response = await request("/api/users", {
          method: "OPTIONS",
          headers: {
            origin: "http://example.com",
            "Access-Control-Request-Method": "POST",
          },
        });

        expect(response.status).toBe(204);
        expect(response.headers.get("Access-Control-Max-Age")).toBe("3600");
      },
      {
        listen: true,
        config: {
          providers: [TestController],
          cors: {
            origins: "http://example.com",
            maxAge: 3600,
          },
        },
      }
    );
  });
});
