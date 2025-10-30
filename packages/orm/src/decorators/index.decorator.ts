import { Metadata } from "@cheetah.js/core";

type IndexDef = { name: string; properties: string[] };
type IndexOptions<T> = { properties: (keyof T)[] } | (keyof T)[] | undefined;

function getCtor(target: any) {
  return typeof target === "function" ? target : target.constructor;
}

function buildFromOptions<T>(options?: IndexOptions<T>): IndexDef | null {
  const props = Array.isArray(options) ? options : options?.properties;
  if (!props || props.length === 0) return null;
  const keys = props as unknown as string[];
  return { name: `${keys.join('_')}_index`, properties: keys };
}

function buildFromProperty(propertyKey?: string | symbol): IndexDef {
  const name = String(propertyKey);
  return { name: `${name}_index`, properties: [name] };
}

function resolveIndex<T>(options?: IndexOptions<T>, propertyKey?: string | symbol): IndexDef {
  const fromOptions = buildFromOptions(options);
  if (fromOptions) return fromOptions;
  if (!propertyKey) throw new Error("@Index on class requires properties option");
  return buildFromProperty(propertyKey);
}

export function Index<T>(options?: IndexOptions<T>): ClassDecorator & PropertyDecorator {
  return (target: any, propertyKey?: symbol | string) => {
    const ctor = getCtor(target);
    const indexes: IndexDef[] = Metadata.get("indexes", ctor) || [];
    const index = resolveIndex(options, propertyKey);
    indexes.push(index);
    Metadata.set("indexes", indexes, ctor);
  };
}
