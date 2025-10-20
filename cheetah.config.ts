import { PgDriver } from './packages/orm/src';
import { ConnectionSettings } from './packages/orm/src';

const config: ConnectionSettings = {
  host: 'localhost',
  port: 5432,
  database: 'postgres',
  username: 'postgres',
  password: 'postgres',
  //@ts-ignore
  driver: PgDriver,
  migrationPath: '/packages/orm/test/migration'
};

export default config;