import { BunPgDriver, ConnectionSettings } from "./src";

const config: ConnectionSettings<any> = {
  host: 'localhost',
  port: 5432,
  database: 'postgres',
  username: 'postgres',
  password: 'postgres',
  driver: BunPgDriver,
  migrationPath: '/packages/orm/test/migration'
};

export default config;