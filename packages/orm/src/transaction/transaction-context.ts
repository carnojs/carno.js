import { AsyncLocalStorage } from 'async_hooks';
import { SQL } from 'bun';

interface TransactionContextData {
  tx: SQL;
}

class TransactionContextManager {
  private storage: AsyncLocalStorage<TransactionContextData>;

  constructor() {
    this.storage = new AsyncLocalStorage<TransactionContextData>();
  }

  run<T>(tx: SQL, callback: () => Promise<T>): Promise<T> {
    return this.storage.run({ tx }, callback);
  }

  getContext(): SQL | undefined {
    return this.storage.getStore()?.tx;
  }

  hasContext(): boolean {
    return this.storage.getStore() !== undefined;
  }
}

export const transactionContext = new TransactionContextManager();
