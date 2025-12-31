import { Carno, InjectorService } from "@carno.js/core";
import { beforeAll, describe, expect, test } from "bun:test";
import { SwaggerModule } from "@carno.js/swagger";

describe("Swagger", () => {
  let injector: InjectorService;

  beforeAll(async () => {
    const app = new Carno();
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
