import { afterEach, describe, expect, it, beforeEach } from "bun:test";
import { Carno, Service, OnApplicationInit, OnApplicationBoot, Controller, Get } from "../src";
import { clearEventRegistry } from "../src/events/Lifecycle";

describe("Lifecycle hooks", () => {
  let app: Carno | null = null;

  afterEach(() => {
    app?.stop();
    app = null;
    clearEventRegistry();
  });

  it("executes OnApplicationInit hooks when app.listen() is called", async () => {
    const executionOrder: string[] = [];

    @Service()
    class InitHookService {
      @OnApplicationInit()
      onAppInit(): void {
        executionOrder.push("hook");
      }
    }

    executionOrder.push("before-listen");

    app = new Carno({ disableStartupLog: true });
    app.services(InitHookService);
    app.listen(3010);

    executionOrder.push("after-listen");

    // The hook should have executed during listen()
    expect(executionOrder).toEqual(["before-listen", "hook", "after-listen"]);
  });

  it("executes OnApplicationBoot hooks after server is ready", async () => {
    const executionOrder: string[] = [];

    @Service()
    class BootHookService {
      @OnApplicationBoot()
      onAppBoot(): void {
        executionOrder.push("boot");
      }
    }

    executionOrder.push("before-listen");

    app = new Carno({ disableStartupLog: true });
    app.services(BootHookService);
    app.listen(3011);

    executionOrder.push("after-listen");

    // Boot hook should have executed after listen
    expect(executionOrder).toEqual(["before-listen", "boot", "after-listen"]);
  });

  it("executes hooks in priority order", async () => {
    const executionOrder: string[] = [];

    @Service()
    class PriorityService {
      @OnApplicationInit(10)
      highPriority(): void {
        executionOrder.push("high");
      }

      @OnApplicationInit(1)
      lowPriority(): void {
        executionOrder.push("low");
      }
    }

    app = new Carno({ disableStartupLog: true });
    app.services(PriorityService);
    app.listen(3012);

    // High priority (10) should execute before low priority (1)
    expect(executionOrder).toEqual(["high", "low"]);
  });
});
