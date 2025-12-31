import { Metadata } from "@carno.js/core";
import { COMPUTED_PROPERTIES } from "../constants";

export function Computed(): PropertyDecorator {
  return (target, propertyKey) => {
    const computedProperties: string[] = Metadata.get(COMPUTED_PROPERTIES, target.constructor) || [];

    computedProperties.push(propertyKey as string);

    Metadata.set(COMPUTED_PROPERTIES, computedProperties, target.constructor);
  };
}
