import { Carno } from "@carno.js/core";
import { CarnoSwaggerConfig, SwaggerService, useConfig } from "./swagger.service";

export const SwaggerModule = (config: CarnoSwaggerConfig) => {
  useConfig(config);
  
  const plugin = new Carno({
    exports: [SwaggerService],
  });
  
  plugin.controllers([SwaggerService]);
  
  return plugin;
};
