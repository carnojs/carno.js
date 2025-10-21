import { Statement } from '../driver/driver.interface';
import { EntityStorage, Options } from '../domain/entities';
import { ValueObject } from '../common/value-object';
import { extendsFrom } from '../utils';

export class ModelTransformer {
  constructor(private entityStorage: EntityStorage) {}

  transform<T>(model: any, statement: Statement<any>, data: any): T {
    const instanceMap = this.createInstances(model, statement);
    const optionsMap = this.buildOptionsMap(instanceMap);

    this.populateProperties(data, instanceMap, optionsMap);
    this.linkJoinedEntities(statement, instanceMap, optionsMap);

    return instanceMap[statement.alias!] as T;
  }

  private createInstances(model: any, statement: Statement<any>): Record<string, any> {
    const instance = this.createInstance(model);
    const instanceMap: Record<string, any> = {
      [statement.alias!]: instance,
    };

    if (statement.join) {
      this.addJoinedInstances(statement, instanceMap);
    }

    return instanceMap;
  }

  private createInstance(model: any): any {
    const instance = new model();
    instance.$_isPersisted = true;
    return instance;
  }

  private addJoinedInstances(statement: Statement<any>, instanceMap: Record<string, any>): void {
    statement.join!.forEach(join => {
      const joinInstance = this.createInstance(join.joinEntity!);
      instanceMap[join.joinAlias] = joinInstance;
    });
  }

  private buildOptionsMap(instanceMap: Record<string, any>): Map<string, Options> {
    const optionsMap = new Map<string, Options>();

    for (const [alias, instance] of Object.entries(instanceMap)) {
      const options = this.entityStorage.get(instance.constructor);
      if (options) {
        optionsMap.set(alias, options);
      }
    }

    return optionsMap;
  }

  private populateProperties(
    data: any,
    instanceMap: Record<string, any>,
    optionsMap: Map<string, Options>,
  ): void {
    Object.entries(data).forEach(([key, value]) => {
      const { alias, propertyName } = this.parseColumnKey(key);
      const entity = instanceMap[alias];

      if (!entity) {
        return;
      }

      this.setPropertyValue(entity, propertyName, value, optionsMap.get(alias)!);
    });
  }

  private parseColumnKey(key: string): { alias: string; propertyName: string } {
    const index = key.indexOf('_');
    return {
      alias: key.substring(0, index),
      propertyName: key.substring(index + 1),
    };
  }

  private setPropertyValue(entity: any, columnName: string, value: any, options: Options): void {
    const propertyInfo = this.findPropertyByColumnName(columnName, options);

    if (!propertyInfo) {
      return;
    }

    const { key, property } = propertyInfo;

    if (this.isValueObjectType(property.type)) {
      entity[key] = new property.type(value);
      return;
    }

    entity[key] = value;
  }

  private findPropertyByColumnName(
    columnName: string,
    options: Options,
  ): { key: string; property: any } | null {
    const entry = Object.entries(options.properties).find(
      ([_, prop]) => prop.options.columnName === columnName,
    );

    if (!entry) {
      return null;
    }

    return { key: entry[0], property: entry[1] };
  }

  private isValueObjectType(type: any): boolean {
    return extendsFrom(ValueObject, type?.prototype);
  }

  private linkJoinedEntities(
    statement: Statement<any>,
    instanceMap: Record<string, any>,
    optionsMap: Map<string, Options>,
  ): void {
    if (!statement.join) {
      return;
    }

    statement.join.forEach(join => {
      this.linkSingleJoin(join, instanceMap, optionsMap);
    });
  }

  private linkSingleJoin(
    join: any,
    instanceMap: Record<string, any>,
    optionsMap: Map<string, Options>,
  ): void {
    const { joinAlias, originAlias, propertyKey } = join;
    const originEntity = instanceMap[originAlias];
    const joinEntity = instanceMap[joinAlias];

    if (!originEntity || !joinEntity) {
      return;
    }

    const property = this.findRelationProperty(originAlias, propertyKey, optionsMap);

    if (property) {
      this.attachJoinedEntity(originEntity, joinEntity, propertyKey, property);
    }
  }

  private findRelationProperty(alias: string, propertyKey: string, optionsMap: Map<string, Options>): any {
    return optionsMap.get(alias)?.relations.find(rel => rel.propertyKey === propertyKey);
  }

  private attachJoinedEntity(originEntity: any, joinEntity: any, propertyKey: string, property: any): void {
    if (property.type === Array) {
      originEntity[propertyKey] = this.appendToArray(originEntity[propertyKey], joinEntity);
    } else {
      originEntity[propertyKey] = joinEntity;
    }
  }

  private appendToArray(existingArray: any[], newItem: any): any[] {
    return existingArray ? [...existingArray, newItem] : [newItem];
  }
}
