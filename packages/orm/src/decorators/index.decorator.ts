import { Metadata } from "@cheetah.js/core";
import { FilterQuery } from "../driver/driver.interface";

export type IndexColumnMap<T> = {
  [K in keyof T as K extends symbol ? never : K]: string;
};

export type IndexPredicate<T> = string | ((columns: IndexColumnMap<T>) => string);

export type IndexWhere<T> = IndexPredicate<T> | FilterQuery<T>;

export type IndexDefinition = {
  name: string;
  properties: string[];
  where?: IndexWhere<any>;
};
type IndexOptions<T> =
  | { properties: (keyof T)[]; where?: IndexWhere<T> }
  | (keyof T)[]
  | undefined;

function getCtor(target: any) {
  return typeof target === "function" ? target : target.constructor;
}

function buildFromOptions<T>(options?: IndexOptions<T>): IndexDefinition | null {
  const props = Array.isArray(options) ? options : options?.properties;
  if (!props || props.length === 0) return null;
  const keys = props as unknown as string[];
  const where = Array.isArray(options) ? undefined : options?.where;
  return { name: `${keys.join('_')}_index`, properties: keys, where };
}

function buildFromProperty(propertyKey?: string | symbol): IndexDefinition {
  const name = String(propertyKey);
  return { name: `${name}_index`, properties: [name] };
}

function resolveIndex<T>(options?: IndexOptions<T>, propertyKey?: string | symbol): IndexDefinition {
  const fromOptions = buildFromOptions(options);
  if (fromOptions) return fromOptions;
  if (!propertyKey) throw new Error("@Index on class requires properties option");
  return buildFromProperty(propertyKey);
}

export function Index<T>(options?: IndexOptions<T>): ClassDecorator & PropertyDecorator {
  return (target: any, propertyKey?: symbol | string) => {
    const ctor = getCtor(target);
    const indexes: IndexDefinition[] = [...(Metadata.get("indexes", ctor) || [])];
    const index = resolveIndex(options, propertyKey);
    indexes.push(index);
    Metadata.set("indexes", indexes, ctor);
  };
}
