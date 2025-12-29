export class EntityRegistry {
  private store: Map<string, WeakRef<any>>;
  private finalizationRegistry: FinalizationRegistry<string>;

  constructor() {
    this.store = new Map();
    this.setupFinalizationRegistry();
  }

  private setupFinalizationRegistry(): void {
    this.finalizationRegistry = new FinalizationRegistry((key) => {
      this.store.delete(key);
    });
  }

  get<T>(key: string): T | undefined {
    const weakRef = this.store.get(key);

    if (!weakRef) {
      return undefined;
    }

    const entity = weakRef.deref();

    if (!entity) {
      this.store.delete(key);
      return undefined;
    }

    return entity;
  }

  set<T extends object>(key: string, entity: T): void {
    const weakRef = new WeakRef(entity);

    this.store.set(key, weakRef);
    this.finalizationRegistry.register(entity, key, entity);
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
