import {LoggerService} from '@cheetah.js/core';
import {EntityStorage} from '../domain/entities';
import {Orm} from '../orm';
import {OrmService} from '../orm.service';
import {BunPgDriver} from '../driver/bun-pg.driver';
import {ConnectionSettings} from '../driver/driver.interface';

export type DatabaseTestContext = {
  orm: Orm<BunPgDriver>;
  executeSql: (sql: string) => Promise<{ rows: unknown[] }>;
};

export type DatabaseTestOptions = {
  schema?: string;
  entityFile?: string;
  logger?: LoggerService;
  connection?: Partial<ConnectionSettings<BunPgDriver>>;
};

type DatabaseSession = {
  orm: Orm<BunPgDriver>;
  schema: string;
};

type DatabaseTestRoutine = (context: DatabaseTestContext) => Promise<void>;

const DEFAULT_SCHEMA = 'public';

const DEFAULT_CONNECTION: ConnectionSettings<BunPgDriver> = {
  host: 'localhost',
  port: 5432,
  database: 'postgres',
  username: 'postgres',
  password: 'postgres',
  driver: BunPgDriver,
};

export async function withDatabase(
  tables: string[],
  routine: DatabaseTestRoutine,
  options: DatabaseTestOptions = {},
): Promise<void> {
  const session = await createSession(options);
  const context = buildContext(session.orm);

  await executeWithinSession(session, context, tables, routine);
}

async function createSession(options: DatabaseTestOptions): Promise<DatabaseSession> {
  const logger = selectLogger(options);
  const orm: Orm<BunPgDriver> = new Orm<BunPgDriver>(logger);

  await initializeOrm(orm, options);

  return {orm, schema: options.schema ?? DEFAULT_SCHEMA};
}

function selectLogger(options: DatabaseTestOptions): LoggerService {
  if (options.logger) {
    return options.logger;
  }

  const config = {applicationConfig: {logger: {level: 'info'}}};

  return new LoggerService(config as any);
}

async function initializeOrm(orm: Orm<BunPgDriver>, options: DatabaseTestOptions): Promise<void> {
  const storage = new EntityStorage();
  const service = new OrmService(orm, storage, options.entityFile);
  const connection = resolveConnection(options.connection);

  await service.onInit(connection);
}

function resolveConnection(
  overrides: Partial<ConnectionSettings<BunPgDriver>> | undefined,
): ConnectionSettings<BunPgDriver> {
  if (!overrides) {
    return DEFAULT_CONNECTION;
  }

  return {
    ...DEFAULT_CONNECTION,
    ...overrides,
    driver: overrides.driver ?? BunPgDriver,
  };
}

function buildContext(orm: Orm<BunPgDriver>): DatabaseTestContext {
  return {
    orm,
    executeSql: (sql: string) => executeSql(orm, sql),
  };
}

async function executeSql(orm: Orm<BunPgDriver>, sql: string): Promise<{ rows: unknown[] }> {
  if (!orm.driverInstance) {
    throw new Error('Database driver not initialized. Call withDatabase() before executing SQL.');
  }

  const result = await orm.driverInstance.executeSql(sql);

  return {rows: Array.isArray(result) ? result : []};
}

async function executeWithinSession(
  session: DatabaseSession,
  context: DatabaseTestContext,
  tables: string[],
  routine: DatabaseTestRoutine,
): Promise<void> {
  try {
    await createTables(context, tables);
    await routine(context);
  } finally {
    await resetSession(session, context);
  }
}

async function createTables(context: DatabaseTestContext, tables: string[]): Promise<void> {
  const statements = tables.filter(Boolean);

  if (statements.length < 1) {
    return;
  }

  await executeStatements(context, statements);
}

async function executeStatements(context: DatabaseTestContext, statements: string[]): Promise<void> {
  for (const statement of statements) {
    await context.executeSql(statement);
  }
}

async function resetSession(
  session: DatabaseSession,
  context: DatabaseTestContext,
): Promise<void> {
  await dropSchema(session, context);
  await session.orm.disconnect();
}

async function dropSchema(session: DatabaseSession, context: DatabaseTestContext): Promise<void> {
  const statement = buildDropStatement(session.schema);

  await context.executeSql(statement);
}

function buildDropStatement(schema: string): string {
  return `DROP SCHEMA IF EXISTS ${schema} CASCADE; CREATE SCHEMA ${schema};`;
}
