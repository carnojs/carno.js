import { CacheSettings, ConnectionSettings, DriverInterface } from './driver/driver.interface';
import { LoggerService, Service, CacheService } from '@carno.js/core';
import { SqlBuilder } from './SqlBuilder';
import { QueryCacheManager } from './cache/query-cache-manager';
import { transactionContext } from './transaction/transaction-context';
import { ormSessionContext } from './orm-session-context';

const DEFAULT_MAX_KEYS_PER_TABLE = 10000;

@Service()
export class Orm<T extends DriverInterface = DriverInterface> {
  driverInstance: T;
  static instance: Orm<any>
  public connection: ConnectionSettings<T>
  public queryCacheManager?: QueryCacheManager;

  constructor(
    public logger: LoggerService,
    public cacheService?: CacheService
  ) {
    Orm.instance = this
  }

  private initializeQueryCacheManager(cacheSettings?: CacheSettings): void {
    if (!this.cacheService) {
      return;
    }

    const maxKeys = cacheSettings?.maxKeysPerTable ?? DEFAULT_MAX_KEYS_PER_TABLE;
    this.queryCacheManager = new QueryCacheManager(this.cacheService, maxKeys);
  }

  static getInstance(): Orm<any> {
    const scoped = ormSessionContext.getOrm();
    if (scoped) {
      return scoped;
    }

    return Orm.instance
  }

  public setConnection(connection: ConnectionSettings<T>) {
    this.connection = connection
    // @ts-ignore
    this.driverInstance = new this.connection.driver(connection)
    this.initializeQueryCacheManager(connection.cache);
  }

  createQueryBuilder<Model>(model: new() => Model): SqlBuilder<Model> {
    return new SqlBuilder<Model>(model)
  }

  connect(): Promise<void> {
    return this.driverInstance.connect()
  }

  disconnect(): Promise<void> {
    return this.driverInstance.disconnect()
  }

  async transaction<ResultType>(operation: (tx: unknown) => Promise<ResultType>): Promise<ResultType> {
    if (!this.driverInstance) {
      throw new Error('Driver instance not initialized')
    }

    if (transactionContext.hasContext()) {
      return operation(transactionContext.getContext());
    }

    return this.driverInstance.transaction(async (tx) => {
      return transactionContext.run(tx as any, () => operation(tx));
    });
  }
}
