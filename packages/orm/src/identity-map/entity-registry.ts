type StoredEntity = WeakRef<any> | object;

export class EntityRegistry {
  private store: Map<string, StoredEntity>;
  private finalizationRegistry?: FinalizationRegistry<string>;
  private readonly useWeakRefs: boolean;

  constructor() {
    this.store = new Map();
    // Bun can GC WeakRefs early; keep strong refs there for identity stability.
    this.useWeakRefs = typeof Bun === 'undefined';
    if (this.useWeakRefs) {
      this.setupFinalizationRegistry();
    }
  }

  private setupFinalizationRegistry(): void {
    this.finalizationRegistry = new FinalizationRegistry((key) => {
      this.store.delete(key);
    });
  }

  get<T>(key: string): T | undefined {
    const value = this.store.get(key);

    if (!value) {
      return undefined;
    }

    if (!this.useWeakRefs) {
      return value as T;
    }

    const entity = (value as WeakRef<any>).deref();

    if (!entity) {
      this.store.delete(key);
      return undefined;
    }

    return entity;
  }

  set<T extends object>(key: string, entity: T): void {
    if (!this.useWeakRefs) {
      this.store.set(key, entity);
      return;
    }

    const weakRef = new WeakRef(entity);

    this.store.set(key, weakRef);
    this.finalizationRegistry?.register(entity, key, entity);
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  remove(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}
