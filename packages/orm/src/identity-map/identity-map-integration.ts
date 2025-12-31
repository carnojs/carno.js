import { identityMapContext } from './identity-map-context';

export class IdentityMapIntegration {
  /**
   * @deprecated Use getOrCreate instead for better type safety
   */
  static getOrCreateInstance<T>(
    model: new () => T,
    primaryKey: any,
    factory: () => T
  ): T {
    return this.getOrCreate(model, primaryKey, factory).instance;
  }

  static getOrCreate<T>(
    model: new () => T,
    primaryKey: any,
    factory: () => T
  ): { instance: T; wasCached: boolean } {
    const identityMap = identityMapContext.getIdentityMap();

    if (!identityMap) {
      return { instance: factory(), wasCached: false };
    }

    if (primaryKey === undefined || primaryKey === null) {
      return { instance: factory(), wasCached: false };
    }

    const cached = identityMap.get<T>(model, primaryKey);

    if (cached) {
      return { instance: cached, wasCached: true };
    }

    const instance = factory();

    identityMap.setByKey<any>(model, primaryKey, instance);

    return { instance, wasCached: false };
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

