import { Cheetah, InjectorService } from "@cheetah.js/core";
import { beforeAll, describe, expect, test } from "bun:test";
import { SwaggerModule } from "@cheetah.js/swagger";

describe("Swagger", () => {
  let injector: InjectorService;

  beforeAll(async () => {
    const app = new Cheetah();
    app.use(SwaggerModule({ path: "/swagger" }));
    try {
      await app.init();
    } catch (e) {
      console.log(e);
    }
    injector = app.getInjector();
  });

  test("should useValue", () => {});
});
