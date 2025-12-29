import { AsyncLocalStorage } from 'async_hooks';
import { IdentityMap } from './identity-map';

export class IdentityMapContext {
  private storage: AsyncLocalStorage<IdentityMap>;

  constructor() {
    this.storage = new AsyncLocalStorage<IdentityMap>();
  }

  run<T>(callback: () => Promise<T>): Promise<T> {
    const identityMap = new IdentityMap();

    return this.storage.run(identityMap, callback);
  }

  getIdentityMap(): IdentityMap | undefined {
    return this.storage.getStore();
  }

  hasContext(): boolean {
    return this.storage.getStore() !== undefined;
  }
}

export const identityMapContext = new IdentityMapContext();
