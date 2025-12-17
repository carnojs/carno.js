import globby from 'globby';
import {promises as fs} from 'fs';
import path from 'path';
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
  storage: EntityStorage;
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

type CachedSession = {
  orm: Orm<BunPgDriver>;
  schema: string;
  storage: EntityStorage;
};

const sessionCache = new Map<string, CachedSession>();

function getCacheKey(options: DatabaseTestOptions): string {
  const connection = resolveConnection(options.connection);
  return JSON.stringify({
    host: connection.host,
    port: connection.port,
    database: connection.database,
    schema: options.schema ?? DEFAULT_SCHEMA,
    entityFile: options.entityFile,
    migrationPath: connection.migrationPath,
  });
}

export async function withDatabase(
  tables: string[],
  routine: DatabaseTestRoutine,
  options?: DatabaseTestOptions,
): Promise<void>;

export async function withDatabase(
  routine: DatabaseTestRoutine,
  options?: DatabaseTestOptions,
  tables?: string[],
): Promise<void>;

export async function withDatabase(
  arg1: DatabaseTestRoutine | string[],
  arg2?: DatabaseTestRoutine | DatabaseTestOptions,
  arg3?: DatabaseTestOptions | string[],
): Promise<void> {
  const {routine: targetRoutine, options: targetOptions, statements} = await normalizeArgs(
    arg1,
    arg2,
    arg3,
  );

  const cacheKey = getCacheKey(targetOptions);
  let cachedSession = sessionCache.get(cacheKey);
  const schemaStatements = await resolveSchemaStatements(statements, targetOptions);

  if (!cachedSession) {
    const session = await createSession(targetOptions);
    cachedSession = {
      orm: session.orm,
      schema: session.schema,
      storage: session.storage,
    };
    sessionCache.set(cacheKey, cachedSession);
  }

  activateSession(cachedSession);

  const context = buildContext(cachedSession.orm);

  await dropAndRecreateSchema(context, cachedSession.schema);
  await prepareSchema(context, cachedSession.schema);
  await createTables(context, schemaStatements);
  await targetRoutine(context);
}

async function createSession(options: DatabaseTestOptions): Promise<DatabaseSession> {
  const logger = selectLogger(options);
  const orm: Orm<BunPgDriver> = new Orm<BunPgDriver>(logger);
  const storage = new EntityStorage();

  await initializeOrm(orm, storage, options);

  return {orm, schema: options.schema ?? DEFAULT_SCHEMA, storage};
}

function selectLogger(options: DatabaseTestOptions): LoggerService {
  if (options.logger) {
    return options.logger;
  }

  const config = {applicationConfig: {logger: {level: 'info'}}};

  return new LoggerService(config as any);
}

async function initializeOrm(
  orm: Orm<BunPgDriver>,
  storage: EntityStorage,
  options: DatabaseTestOptions,
): Promise<void> {

  if (options.entityFile) {
    const entityFiles = await globby(options.entityFile, {absolute: true});

    for (const file of entityFiles) {
      await import(file);
    }
  }

  const service = new OrmService(orm, storage, options.entityFile);
  const connection = resolveConnection(options.connection);

  await service.onInit(connection);
}

function activateSession(session: CachedSession): void {
  Orm.instance = session.orm;

  EntityStorage.instance = session.storage;
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

async function createTables(context: DatabaseTestContext, statements: string[]): Promise<void> {
  const payload = statements.filter(Boolean);

  if (payload.length < 1) {
    return;
  }

  await executeStatements(context, payload);
}

async function executeStatements(context: DatabaseTestContext, statements: string[]): Promise<void> {
  for (const statement of statements) {
    await context.executeSql(statement);
  }
}

async function dropAndRecreateSchema(context: DatabaseTestContext, schema: string): Promise<void> {
  await context.executeSql(`DROP SCHEMA IF EXISTS ${schema} CASCADE; CREATE SCHEMA ${schema};`);
}

type WithDatabaseArgs = {
  routine: DatabaseTestRoutine;
  options: DatabaseTestOptions;
  statements: string[];
};

async function normalizeArgs(
  tablesOrRoutine: DatabaseTestRoutine | string[],
  routineOrOptions: DatabaseTestOptions | DatabaseTestRoutine | undefined,
  optionsOrStatements: string[] | DatabaseTestOptions | undefined,
): Promise<WithDatabaseArgs> {
  if (Array.isArray(tablesOrRoutine)) {
    return {
      routine: routineOrOptions as DatabaseTestRoutine,
      options: (optionsOrStatements as DatabaseTestOptions) ?? {},
      statements: tablesOrRoutine,
    };
  }

  return {
    routine: tablesOrRoutine,
    options: (routineOrOptions as DatabaseTestOptions) ?? {},
    statements: Array.isArray(optionsOrStatements) ? optionsOrStatements : [],
  };
}

async function resolveSchemaStatements(
  statements: string[],
  options: DatabaseTestOptions,
): Promise<string[]> {
  const explicit = statements.filter(Boolean);

  if (explicit.length > 0) {
    return explicit;
  }

  const fromMigrations = await loadStatementsFromMigrations(options);

  return fromMigrations.filter(Boolean);
}

function normalizeGlobPatterns(patterns: string[]): string[] {
  return patterns.map(normalizeGlobPattern);
}

function normalizeGlobPattern(pattern: string): string {
  return pattern.replace(/\\/g, '/');
}

async function loadStatementsFromMigrations(options: DatabaseTestOptions): Promise<string[]> {
  const connection = resolveConnection(options.connection);
  const patterns = await resolveMigrationPatterns(connection);

  if (patterns.length < 1) {
    return [];
  }

  const normalizedPatterns = normalizeGlobPatterns(patterns);
  const files = await globby(normalizedPatterns, {absolute: true, expandDirectories: false});

  if (files.length < 1) {
    return [];
  }

  const orderedFiles = sortMigrationFiles(files);

  return extractStatementsFromFiles(orderedFiles);
}

async function resolveMigrationPatterns(
  connection: ConnectionSettings<BunPgDriver>,
): Promise<string[]> {
  if (connection.migrationPath) {
    return [connection.migrationPath];
  }

  const inferred = await inferMigrationPathFromConfig();

  if (inferred) {
    return [inferred];
  }

  return [];
}

async function inferMigrationPathFromConfig(): Promise<string | undefined> {
  const configFile = await findConfigFile();

  if (!configFile) {
    return undefined;
  }

  const contents = await safeReadFile(configFile);

  if (!contents) {
    return undefined;
  }

  return extractMigrationPath(contents, configFile);
}

async function findConfigFile(): Promise<string | undefined> {
  const candidates = [
    'cheetah.config.ts',
    'cheetah.config.js',
    'cheetah.config.mjs',
    'cheetah.config.cjs',
  ];

  for (const file of candidates) {
    const fullPath = path.resolve(process.cwd(), file);
    const exists = await fileExists(fullPath);

    if (exists) {
      return fullPath;
    }
  }

  return undefined;
}

async function fileExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function safeReadFile(file: string): Promise<string | undefined> {
  try {
    return await fs.readFile(file, 'utf8');
  } catch {
    return undefined;
  }
}

function extractMigrationPath(source: string, file: string): string | undefined {
  const match = source.match(/migrationPath\s*:\s*['"`]([^'"`]+)['"`]/);

  if (!match) {
    return undefined;
  }

  const candidate = match[1].trim();

  if (path.isAbsolute(candidate)) {
    return candidate;
  }

  const baseDir = path.dirname(file);

  return path.resolve(baseDir, candidate);
}

async function extractStatementsFromFiles(files: string[]): Promise<string[]> {
  const statements: string[] = [];

  for (const file of files) {
    const payload = await safeReadFile(file);

    if (!payload) {
      continue;
    }

    const extracted = extractStatements(payload);
    statements.push(...extracted);
  }

  return Array.from(new Set(statements));
}

function extractStatements(payload: string): string[] {
  const matches =
    payload.match(
      /(CREATE\s+(?:TABLE|TYPE|INDEX|SCHEMA)[\s\S]*?;|ALTER\s+TABLE[\s\S]*?\bADD\b[\s\S]*?;)/gi,
    ) ?? [];

  return matches.map((statement) => statement.replace(/\s+/g, ' ').trim());
}

function sortMigrationFiles(files: string[]): string[] {
  return [...files].sort((first, second) =>
    path.basename(first).localeCompare(path.basename(second), undefined, {numeric: true}),
  );
}

async function prepareSchema(context: DatabaseTestContext, schema: string): Promise<void> {
  await context.executeSql(buildCreateSchemaStatement(schema));
  await ensureSearchPath(context, schema);
}

function buildCreateSchemaStatement(schema: string): string {
  return `CREATE SCHEMA IF NOT EXISTS ${schema};`;
}

async function ensureSearchPath(context: DatabaseTestContext, schema: string): Promise<void> {
  await context.executeSql(buildSearchPathStatement(schema));
}

function buildSearchPathStatement(schema: string): string {
  return `SET search_path TO ${schema};`;
}
