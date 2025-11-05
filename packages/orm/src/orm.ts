import { ConnectionSettings, DriverInterface } from './driver/driver.interface';
import { LoggerService, Service, CacheService } from '@cheetah.js/core';
import { SqlBuilder } from './SqlBuilder';

@Service()
export class Orm<T extends DriverInterface = DriverInterface> {
  driverInstance: T;
  static instance: Orm<any>
  public connection: ConnectionSettings<T>
  public queryCacheManager?: any;

  constructor(
    public logger: LoggerService,
    public cacheService?: CacheService
  ) {
    Orm.instance = this
    this.initializeQueryCacheManager();
  }

  private initializeQueryCacheManager(): void {
    if (this.cacheService) {
      const { QueryCacheManager } = require('./cache/query-cache-manager');
      this.queryCacheManager = new QueryCacheManager(this.cacheService);
    }
  }

  static getInstance(): Orm<any> {
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
}