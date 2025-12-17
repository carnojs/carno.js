import { ConnectionSettings, DriverInterface } from './driver/driver.interface';
import { LoggerService, Service, CacheService } from '@cheetah.js/core';
import { SqlBuilder } from './SqlBuilder';
import { QueryCacheManager } from './cache/query-cache-manager';
import { transactionContext } from './transaction/transaction-context';
import { ormSessionContext } from './orm-session-context';

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
    this.initializeQueryCacheManager();
  }

  private initializeQueryCacheManager(): void {
    if (this.cacheService) {
      this.queryCacheManager = new QueryCacheManager(this.cacheService);
    }
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
