import { EntityStorage } from '../domain/entities';

export class EntityKeyGenerator {
  private entityStorage: EntityStorage;

  constructor() {
    this.entityStorage = EntityStorage.getInstance();
  }

  generate(entityClass: Function, pk: any): string {
    const className = this.getClassName(entityClass);
    const keyValue = this.serializePrimaryKey(pk);

    return `${className}:${keyValue}`;
  }

  generateForEntity(entity: any): string {
    const pk = this.extractPrimaryKey(entity);

    return this.generate(entity.constructor, pk);
  }

  extractPrimaryKey(entity: any): any {
    const pkName = this.getPrimaryKeyName(entity.constructor);

    return entity[pkName];
  }

  private getPrimaryKeyName(entityClass: Function): string {
    const options = this.entityStorage.get(entityClass);

    if (!options) {
      return 'id';
    }

    for (const prop in options.properties) {
      const property = options.properties[prop];

      if (property.options.isPrimary) {
        return prop;
      }
    }

    return 'id';
  }

  private serializePrimaryKey(pk: any): string {
    if (Array.isArray(pk)) {
      return pk.join(':');
    }

    return String(pk);
  }

  private getClassName(entityClass: Function): string {
    return entityClass.name;
  }
}
