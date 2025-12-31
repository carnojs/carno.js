import { Metadata } from "@carno.js/core";

export type UniqueDefinition = {
  name: string;
  properties: string[];
};

type UniqueOptions<T> =
  | { properties: (keyof T)[] }
  | (keyof T)[]
  | undefined;

function getCtor(target: any) {
  return typeof target === "function" ? target : target.constructor;
}

function buildFromOptions<T>(options?: UniqueOptions<T>): UniqueDefinition | null {
  const props = Array.isArray(options) ? options : options?.properties;

  if (!props || props.length === 0) {
    return null;
  }

  const keys = props as unknown as string[];

  return {
    name: `${keys.join('_')}_unique`,
    properties: keys,
  };
}

function buildFromProperty(propertyKey?: string | symbol): UniqueDefinition {
  const name = String(propertyKey);

  return {
    name: `${name}_unique`,
    properties: [name],
  };
}

function resolveUnique<T>(
  options?: UniqueOptions<T>,
  propertyKey?: string | symbol,
): UniqueDefinition {
  const fromOptions = buildFromOptions(options);

  if (fromOptions) {
    return fromOptions;
  }

  if (!propertyKey) {
    throw new Error("@Unique on class requires properties option");
  }

  return buildFromProperty(propertyKey);
}

export function Unique<T>(
  options?: UniqueOptions<T>,
): ClassDecorator & PropertyDecorator {
  return (target: any, propertyKey?: symbol | string) => {
    const ctor = getCtor(target);
    const uniques: UniqueDefinition[] = [...(Metadata.get("uniques", ctor) || [])];
    const unique = resolveUnique(options, propertyKey);

    uniques.push(unique);

    Metadata.set("uniques", uniques, ctor);
  };
}
