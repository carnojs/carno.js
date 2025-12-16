import { PROPERTIES_RELATIONS } from '../constants';
import { EntityName, Relationship } from '../driver/driver.interface';
import { Metadata } from '@cheetah.js/core';
import { toSnakeCase } from '../utils';
import { PropertyOptions } from './property.decorator';
import { Index } from './index.decorator';

export function OneToMany<T>(entity: () => EntityName<T>, fkKey: (string & keyof T) | ((e: T) => any)): PropertyDecorator {
  return (target, propertyKey) => {
    const existing: Relationship<T>[] = Metadata.get(PROPERTIES_RELATIONS, target.constructor) || [];
    const options = {relation: 'one-to-many', propertyKey, isRelation: true, entity, fkKey, type: Metadata.getType(target, propertyKey), originalEntity: target.constructor}
    options['columnName'] = `${toSnakeCase(propertyKey as string)}_id`;
    // @ts-ignore
    existing.push(options);
    Metadata.set(PROPERTIES_RELATIONS, existing, target.constructor);
  };
}

type ManyToOneOptions = Partial<PropertyOptions>;

export function ManyToOne<T>(
  entityOrOptions?: (() => EntityName<T>) | ManyToOneOptions,
  maybeOptions?: ManyToOneOptions
): PropertyDecorator {
  return (target, propertyKey) => {
    const existing: Relationship<T>[] = Metadata.get(PROPERTIES_RELATIONS, target.constructor) || [];

    const hasEntity = typeof entityOrOptions === 'function';
    const entity = hasEntity ? (entityOrOptions as () => EntityName<T>) : undefined;
    const options = (!hasEntity ? entityOrOptions : maybeOptions) || {};

    const columnName = options.columnName || `${toSnakeCase(propertyKey as string)}_id`;
    const relationOptions = {
      relation: 'many-to-one',
      propertyKey,
      isRelation: true,
      entity: entity || '__AUTO_DETECT__',
      type: Metadata.getType(target, propertyKey),
      originalEntity: target.constructor,
      columnName,
      ...options,
    };

    if (options.index) {
      Index({ properties: [propertyKey as string] })(target, propertyKey);
    }

    existing.push(relationOptions as Relationship<T>);
    Metadata.set(PROPERTIES_RELATIONS, existing, target.constructor);
  };
}
