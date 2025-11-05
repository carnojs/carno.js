import { Service } from '../commons/decorators/service.decorator';
import { LoggerService } from '../services/logger.service';
import { CacheService } from './cache.service';
import { BentoCache, bentostore } from 'bentocache';
// @ts-ignore
import { memoryDriver } from 'bentocache/drivers/memory';

@Service({ provide: CacheService })
export class BentoCacheDriver extends CacheService {
  private cache: BentoCache<any>

  constructor(private readonly logger: LoggerService) {
    super();
    this.cache = new BentoCache({
      //@ts-ignore
      logger: this.logger.getLogger(),
      default: 'defaultCache',
      stores: {
        defaultCache: bentostore().useL1Layer((memoryDriver({ maxSize: 10_000}))), // TODO: Not default, custom with properties.
      }
    })
  }

  set(key: string, value: any, ttl?: number): Promise<boolean> {
    return this.cache.set({key, value, ttl: ttl ?? '1h'})
  }

  get(key: string): Promise<any> {
    return this.cache.get({key})
  }

  del(key: string): Promise<boolean> {
    return this.cache.delete({key})
  }

  has(key: string): Promise<boolean> {
    return this.cache.has({key})
  }

  clear(): Promise<void> {
    return this.cache.clear()
  }

  getOrSet(key: string, cb: () => Promise<any>, ttl?: number): Promise<any> {
    return this.cache.getOrSet({key, factory: cb, ttl: ttl ?? '1h'})
  }
}