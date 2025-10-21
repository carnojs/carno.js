import { ValueObject } from '../common/value-object';
import { BaseEntity } from '../domain/base-entity';
import { EntityStorage, Options } from '../domain/entities';
import { ValueOrInstance } from '../driver/driver.interface';
import { extendsFrom } from '../utils';

export class ValueProcessor {
  static processForInsert<T>(
    values: Partial<{ [K in keyof T]: ValueOrInstance<T[K]> }>,
    options: Options,
  ): Record<string, any> {
    const newValue = {};

    for (const value in values) {
      const columnName = ValueProcessor.getColumnName(value, options);

      if (ValueProcessor.isValueObject(values[value])) {
        newValue[columnName] = (values[value] as ValueObject<any, any>).getValue();
        continue;
      }

      if (ValueProcessor.isBaseEntity(values[value])) {
        // @ts-ignore
        newValue[columnName] = (values[value] as BaseEntity).id;
        continue;
      }

      newValue[columnName] = values[value];
    }

    return newValue;
  }

  static processForUpdate<T>(
    values: Partial<{ [K in keyof T]: ValueOrInstance<T[K]> }>,
    options: Options,
  ): Record<string, any> {
    const newValue = {};

    for (const value in values) {
      const columnName = ValueProcessor.getColumnName(value, options);

      if (ValueProcessor.isValueObject(values[value])) {
        newValue[columnName] = (values[value] as ValueObject<any, any>).getValue();
        continue;
      }

      newValue[columnName] = values[value];
    }

    return newValue;
  }

  static getColumnName(propertyKey: string, entity: Options): string {
    if (propertyKey.startsWith('$')) {
      return propertyKey;
    }

    const property = entity.properties[propertyKey];
    const relation = entity.relations?.find(rel => rel.propertyKey === propertyKey);

    if (!property) {
      if (!relation) {
        throw new Error('Property not found');
      }
      return relation.columnName || propertyKey;
    }

    return property.options.columnName || propertyKey;
  }

  static createInstance(
    values: any,
    entity: Function,
    moment: 'insert' | 'update' | undefined = undefined,
  ): any {
    const entityStorage = EntityStorage.getInstance();
    const entityOptions = entityStorage.get(entity);
    const instance = new (entity as any)();

    if (!entityOptions) {
      throw new Error('Entity not found');
    }

    const property = Object.entries(entityOptions.properties);
    const relations = entityOptions.relations;

    property.forEach(([key, property]) => {
      if (property.options.onInsert && moment === 'insert') {
        instance[key] = property.options.onInsert!();
      }

      if (property.options.onUpdate && moment === 'update') {
        instance[key] = property.options.onUpdate!();
      }

      if (key in values) {
        instance[key] = values[property.options.columnName];
      }
    });

    if (relations) {
      for (const relation of relations) {
        if (relation.relation === 'many-to-one') {
          instance[relation.propertyKey] = values[relation.columnName];
        }
      }
    }

    return instance;
  }

  private static isValueObject(value: any): boolean {
    return extendsFrom(ValueObject, value?.constructor?.prototype);
  }

  private static isBaseEntity(value: any): boolean {
    return value instanceof BaseEntity;
  }
}
