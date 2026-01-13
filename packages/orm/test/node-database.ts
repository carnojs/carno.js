import { EntityStorage } from 'packages/orm/src/domain/entities';
import { CacheService } from '@carno.js/core';
import { spyOn } from 'bun:test';
import { Orm, OrmService, setDebugEnabled, resetLogger } from "../src";
import { DriverInterface } from "../src/driver/driver.interface";
import {
  getDefaultConnectionSettings,
  getDriverClass,
  getDriverType,
} from "../src/driver/driver-factory";

const cacheService = new CacheService();

export let app: Orm<DriverInterface>
export let mockLogger: ReturnType<typeof spyOn>
export { cacheService }

export async function startDatabase(entityFile: string | undefined = undefined) {
  resetLogger();
  //setDebugEnabled(true);

  app = new Orm(cacheService);
  mockLogger = spyOn(app.logger, 'debug');

  const driverType = getDriverType();
  const driver = getDriverClass(driverType);
  const settings = getDefaultConnectionSettings(driverType);

  const service = new OrmService(app, new EntityStorage(), entityFile);

  await service.onInit({
    ...settings,
    driver,
    max: 10,
  });
}

export async function purgeDatabase(schema: string = 'public') {
  if (!app?.driverInstance) {
    throw new Error('Database not initialized. Connection probably failed in startDatabase()');
  }

  if (app.driverInstance.dbType === 'mysql') {
    await purgeMysqlDatabase();

    return;
  }

  await app.driverInstance.executeSql(`DROP SCHEMA IF EXISTS ${schema} CASCADE; CREATE SCHEMA ${schema};`);
}

async function purgeMysqlDatabase() {
  await app.driverInstance.executeSql('SET FOREIGN_KEY_CHECKS = 0');

  const result = await app.driverInstance.executeSql(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'`
  );

  const rows = Array.isArray(result) ? result : [];

  for (const row of rows as any[]) {
    const tableName = row.table_name || row.TABLE_NAME;

    await app.driverInstance.executeSql(`DROP TABLE IF EXISTS \`${tableName}\``);
  }

  await app.driverInstance.executeSql('SET FOREIGN_KEY_CHECKS = 1');
}

export async function execute(sql: string) {
  if (!app?.driverInstance) {
    console.log("Database not initialized. Connection probably failed in startDatabase()")
    throw new Error('Database not initialized. Connection probably failed in startDatabase()');
  }


  let adaptedSql = sql;

  if (app.driverInstance.dbType === 'mysql') {
    adaptedSql = adaptSqlForMysql(sql);
  }

  const result = await app.driverInstance.executeSql(adaptedSql);

  return { rows: Array.isArray(result) ? result : [] };
}

function adaptSqlForMysql(sql: string): string {
  let adapted = sql;

  adapted = adapted.replace(/SERIAL\s+PRIMARY\s+KEY/gi, 'INT AUTO_INCREMENT PRIMARY KEY');
  adapted = adapted.replace(/SERIAL/gi, 'INT AUTO_INCREMENT');
  adapted = adapted.replace(/NOW\(\)/gi, 'CURRENT_TIMESTAMP');
  adapted = adapted.replace(/boolean/gi, 'TINYINT(1)');
  adapted = adapted.replace(/TRUE/gi, '1');
  adapted = adapted.replace(/FALSE/gi, '0');
  adapted = adapted.replace(/"public"\./g, '');
  adapted = adapted.replace(/public\./g, '');
  adapted = adapted.replace(/"test_schema"\./g, '');
  // Remove inline REFERENCES clauses (MySQL doesn't support PostgreSQL inline FK syntax)
  adapted = adapted.replace(/\s+REFERENCES\s+`[^`]+`\s*\(`[^`]+`\)/gi, '');
  adapted = adapted.replace(/\s+REFERENCES\s+"[^"]+"\s*\("[^"]+"\)/gi, '');
  adapted = adapted.replace(/"([^"]+)"/g, '`$1`');

  return adapted;
}
