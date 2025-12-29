import { identityMapContext } from './identity-map-context';

export class IdentityMapIntegration {
  static getOrCreateInstance<T>(
    model: new () => T,
    primaryKey: any,
    factory: () => T
  ): T {
    const identityMap = identityMapContext.getIdentityMap();

    if (!identityMap) {
      return factory();
    }

    if (primaryKey === undefined || primaryKey === null) {
      return factory();
    }

    const cached = identityMap.get<T>(model, primaryKey);

    if (cached) {
      return cached;
    }

    const instance = factory();

    return instance;
  }

  static registerEntity<T extends object>(entity: T): void {
    const identityMap = identityMapContext.getIdentityMap();

    if (!identityMap) {
      return;
    }

    identityMap.set(entity);
  }

  static getEntity<T>(
    entityClass: new () => T,
    primaryKey: any
  ): T | undefined {
    const identityMap = identityMapContext.getIdentityMap();

    if (!identityMap) {
      return undefined;
    }

    return identityMap.get(entityClass, primaryKey);
  }
}
