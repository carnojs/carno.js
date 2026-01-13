import { BunPgDriver } from './bun-pg.driver';
import { BunMysqlDriver } from './bun-mysql.driver';
import { ConnectionSettings, DriverInterface } from './driver.interface';

export type DriverType = 'postgres' | 'mysql';

export type DriverClass = new (
  options: ConnectionSettings
) => DriverInterface;

export function getDriverType(): DriverType {
  const envDriver = process.env.DB_DRIVER?.toLowerCase();

  return envDriver === 'mysql' ? 'mysql' : 'postgres';
}

export function getDriverClass(type: DriverType): DriverClass {
  return type === 'mysql' ? BunMysqlDriver : BunPgDriver;
}

export function getDefaultConnectionSettings(type: DriverType) {
  if (type === 'mysql') {
    return {
      host: 'localhost',
      port: 3306,
      database: 'mysql_test',
      username: 'root',
      password: 'root',
    };
  }

  return {
    host: 'localhost',
    port: 5433,
    database: 'postgres',
    username: 'postgres',
    password: 'postgres',
  };
}
