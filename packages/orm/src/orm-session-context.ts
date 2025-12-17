import { AsyncLocalStorage } from 'async_hooks';
import type { Orm } from './orm';
import type { EntityStorage } from './domain/entities';

type OrmSession = {
  orm: Orm<any>;
  storage: EntityStorage;
};

class OrmSessionContext {
  private storage: AsyncLocalStorage<OrmSession>;

  constructor() {
    this.storage = new AsyncLocalStorage<OrmSession>();
  }

  run<T>(session: OrmSession, routine: () => Promise<T>): Promise<T> {
    return this.storage.run(session, routine);
  }

  getOrm(): Orm<any> | undefined {
    return this.storage.getStore()?.orm;
  }

  getStorage(): EntityStorage | undefined {
    return this.storage.getStore()?.storage;
  }

  hasContext(): boolean {
    return this.storage.getStore() !== undefined;
  }
}

export const ormSessionContext = new OrmSessionContext();
export type { OrmSession };
