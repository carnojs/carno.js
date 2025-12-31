import { EntityKeyGenerator } from './entity-key-generator';
import { EntityRegistry } from './entity-registry';

export class IdentityMap {
  private registry: EntityRegistry;
  private keyGenerator: EntityKeyGenerator;

  constructor() {
    this.registry = new EntityRegistry();
    this.keyGenerator = new EntityKeyGenerator();
  }

  get<T>(entityClass: Function, pk: any): T | undefined {
    const key = this.keyGenerator.generate(entityClass, pk);

    return this.registry.get(key);
  }

  set<T extends object>(entity: T): void {
    const key = this.keyGenerator.generateForEntity(entity);

    this.registry.set(key, entity);
  }

  setByKey<T extends object>(entityClass: Function, pk: any, entity: T): void {
    const key = this.keyGenerator.generate(entityClass, pk);

    this.registry.set(key, entity);
  }

  has(entityClass: Function, pk: any): boolean {
    const key = this.keyGenerator.generate(entityClass, pk);

    return this.registry.has(key);
  }

  remove(entityClass: Function, pk: any): void {
    const key = this.keyGenerator.generate(entityClass, pk);

    this.registry.remove(key);
  }

  clear(): void {
    this.registry.clear();
  }
}

