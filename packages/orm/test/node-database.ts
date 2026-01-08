import {EntityStorage} from 'packages/orm/src/domain/entities';
import {CacheService} from '@carno.js/core';
import {spyOn} from 'bun:test';
import {Orm, OrmService, BunPgDriver, setDebugEnabled, resetLogger} from "../src";

const cacheService = new CacheService();

export let app: Orm<BunPgDriver>
export let mockLogger: ReturnType<typeof spyOn>
export { cacheService }

export async function startDatabase(entityFile: string | undefined = undefined) {
  resetLogger();
  setDebugEnabled(true);

  app = new Orm(cacheService);
  mockLogger = spyOn(app.logger, 'debug');

  const service = new OrmService(app, new EntityStorage(), entityFile);

  await service.onInit({
    host: 'localhost',
    port: 5433,
    database: 'postgres',
    username: 'postgres',
    password: 'postgres',
    driver: BunPgDriver,
  });
}

export async function purgeDatabase(schema: string = 'public') {
  if (!app?.driverInstance) {
    throw new Error('Database not initialized. Connection probably failed in startDatabase()');
  }
  await app.driverInstance.executeSql(`DROP SCHEMA IF EXISTS ${schema} CASCADE; CREATE SCHEMA ${schema};`);
}

export async function execute(sql: string) {
  if (!app?.driverInstance) {
      console.log("Database not initialized. Connection probably failed in startDatabase()")
      throw new Error('Database not initialized. Connection probably failed in startDatabase()');
  }

  const result = await app.driverInstance.executeSql(sql);

  return { rows: Array.isArray(result) ? result : [] };
}
