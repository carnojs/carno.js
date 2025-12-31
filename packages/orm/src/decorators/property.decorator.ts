import { PROPERTIES, PROPERTIES_METADATA } from "../constants";
import { extendsFrom, getDefaultLength, toSnakeCase } from "../utils";
import { isObject, Metadata } from "@carno.js/core";
import { Index, IndexDefinition } from "./index.decorator";
import { ValueObject } from "..";

export type PropertyOptions = {
  isPrimary?: boolean;
  nullable?: boolean;
  default?: any;
  length?: number;
  hidden?: boolean;
  unique?: boolean;
  index?: boolean;
  precision?: number;
  scale?: number;
  dbType?:
    | "varchar"
    | "text"
    | "int"
    | "bigint"
    | "float"
    | "double"
    | "decimal"
    | "date"
    | "datetime"
    | "time"
    | "timestamp"
    | "boolean"
    | "json"
    | "jsonb"
    | "enum"
    | "array"
    | "uuid";
  autoIncrement?: boolean;
  columnName?: string;
  isEnum?: boolean;
  enumItems?: string[] | number[] | '__AUTO_DETECT__';
  array?: boolean;
  onUpdate?: () => any;
  onInsert?: () => any;
};

export type Prop = { propertyKey: any; options: PropertyOptions | undefined };

export function Property(options?: PropertyOptions): PropertyDecorator {
    return (target, propertyKey) => {
        const properties: Prop[] = Metadata.get(PROPERTIES, target.constructor) || [];

        // 1) Resolva o tipo logo no início
        const propType = Metadata.getType(target, propertyKey);
        const length = (options && options.length) || getDefaultLength(propType?.name);

        if (isObject(propType) && options.dbType !== "enum") {
            throw new Error(`Property ${String(propertyKey)} has unknown type`);
        }

        options = { length, ...options };
        options["columnName"] = options?.columnName || toSnakeCase(propertyKey as string);

        if (propType && extendsFrom(ValueObject, propType.prototype)) {
            let instance = new propType(null, true).getDatabaseValues();
            options["length"] = instance.max;
            options["precision"] = instance.precision;
            options["scale"] = instance.scale;
            instance = null; // Garbage collector
        }

        properties.push({ propertyKey, options });
        Metadata.set(PROPERTIES, properties, target.constructor);

        if (options.isPrimary) {
            const indexes: IndexDefinition[] = Metadata.get("indexes", target.constructor) || [];
            indexes.push({ name: `[TABLE]_pkey`, properties: [propertyKey as string] });
            Metadata.set("indexes", indexes, target.constructor);
        }

        if (options.index) {
            Index({ properties: [propertyKey as string] })(target, propertyKey);
        }

        // 2) Atualize PROPERTIES_METADATA apenas para esta propriedade
        const existingTypes = Metadata.get(PROPERTIES_METADATA, target.constructor) || {};
        // Cria uma cópia para evitar mutação compartilhada entre entidades
        const types = { ...existingTypes };
        types[propertyKey as string] = { type: propType, options };
        Metadata.set(PROPERTIES_METADATA, types, target.constructor);
    };
}
