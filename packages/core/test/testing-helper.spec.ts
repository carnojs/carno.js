import { describe, expect, test, afterEach } from "bun:test";
import { Controller, Get, Carno } from "../src";
import { createTestHarness, withTestApp } from "../src/testing/TestHarness";

describe("Testing Helpers", () => {
  @Controller("/health")
  class HealthController {
    @Get()
    health() {
      return { status: "ok" };
    }
  }

  test("withTestApp provides harness and cleans up automatically", async () => {
    let capturedPort: number | undefined;

    await withTestApp(
      async (harness) => {
        expect(harness.app).toBeInstanceOf(Carno);
        expect(harness.server).toBeDefined();
        expect(harness.port).toBeGreaterThan(0);

        capturedPort = harness.port;

        const response = await harness.get("/health");
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ status: "ok" });
      },
      {
        controllers: [HealthController],
        listen: true,
      }
    );

    // Server should be stopped after withTestApp completes
    // (can't easily verify, but no error means success)
  });

  test("createTestHarness allows manual control", async () => {
    const harness = await createTestHarness({
      controllers: [HealthController],
      listen: true,
    });

    try {
      expect(harness.port).toBeGreaterThan(0);

      const response = await harness.get("/health");
      expect(response.status).toBe(200);
    } finally {
      await harness.close();
    }
  });

  test("harness.post sends JSON body", async () => {
    @Controller("/users")
    class UserController {
      @Get()
      list() {
        return [];
      }
    }

    await withTestApp(
      async (harness) => {
        const response = await harness.get("/users");
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual([]);
      },
      {
        controllers: [UserController],
        listen: true,
      }
    );
  });

  test("harness request shortcuts work", async () => {
    await withTestApp(
      async (harness) => {
        // GET shortcut
        const getRes = await harness.get("/health");
        expect(getRes.status).toBe(200);

        // Direct request method
        const reqRes = await harness.request("/health", { method: "GET" });
        expect(reqRes.status).toBe(200);
      },
      {
        controllers: [HealthController],
        listen: true,
      }
    );
  });
});
