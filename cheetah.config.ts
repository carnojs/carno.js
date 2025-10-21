import {BunPgDriver, ConnectionSettings} from './packages/orm/src';

const config: ConnectionSettings = {
  host: 'localhost',
  port: 5432,
  database: 'postgres',
  username: 'postgres',
  password: 'postgres',
  driver: BunPgDriver,
  migrationPath: '/packages/orm/test/migration'
};

export default config;