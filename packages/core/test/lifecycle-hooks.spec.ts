import { afterEach, describe, expect, it } from "bun:test";
import { Carno, Injectable, OnApplicationInit } from "../src";
import { CONTROLLER_EVENTS } from "../src/constants";
import { Metadata } from "../src/domain";

describe("Lifecycle hooks", () => {
  afterEach(() => {
    Metadata.set(CONTROLLER_EVENTS, [], Reflect);
  });

  it("awaits OnApplicationInit hooks before completing init", async () => {
    // Given
    const executionOrder: string[] = [];

    @Injectable()
    class InitHookService {
      @OnApplicationInit()
      async onAppInit(): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, 0));

        executionOrder.push("hook");
      }
    }

    const app = new Carno({ providers: [InitHookService] });

    executionOrder.push("before-init");

    // When
    await app.init();

    executionOrder.push("after-init");

    // Then
    expect(executionOrder).toEqual(["before-init", "hook", "after-init"]);
  });
});
