import { Carno, registerController } from "@carno.js/core";
import { CarnoSwaggerConfig, SwaggerService, useConfig } from "./swagger.service";

export const SwaggerModule = (config: CarnoSwaggerConfig) => {
  const app = new Carno({
    exports: [SwaggerService],
    providers: [SwaggerService],
  });
  useConfig(config);
  return app;
};
