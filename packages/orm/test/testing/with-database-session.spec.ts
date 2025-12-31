import {describe, expect, test} from 'bun:test';
import {LoggerService} from '@carno.js/core';
import {withDatabase} from '../../src/testing';
import {BaseEntity} from '../../src/domain/base-entity';
import {EntityStorage} from '../../src/domain/entities';
import {Orm} from '../../src/orm';
import {Repository} from '../../src/repository/Repository';
import {Entity} from '../../src/decorators/entity.decorator';
import {PrimaryKey} from '../../src/decorators/primary-key.decorator';
import {Property} from '../../src/decorators/property.decorator';

const SESSION_TABLE = `
  CREATE TABLE "session_probe" (
    "id" SERIAL PRIMARY KEY,
    "name" varchar(255) NOT NULL
  );
`;

const ENTITY_FILE = 'packages/orm/test/testing/with-database-session.spec.ts';

const SESSION_OPTIONS = {
  entityFile: ENTITY_FILE,
  connection: {port: 5433},
};

@Entity({tableName: 'session_probe'})
class SessionProbe extends BaseEntity {
  @PrimaryKey()
  id: number;

  @Property()
  name: string;
}

class SessionRepository extends Repository<SessionProbe> {
  constructor() {
    super(SessionProbe);
  }
}

function buildLogger(): LoggerService {
  const config = {applicationConfig: {logger: {level: 'info'}}};

  return new LoggerService(config as any);
}

function overwriteGlobals(): void {
  const logger = buildLogger();

  new Orm(logger);

  new EntityStorage();
}

function givenRepository(): SessionRepository {
  const repository = new SessionRepository();

  return repository;
}

async function whenCreateProbe(
  repository: SessionRepository,
): Promise<SessionProbe> {
  const created = await repository.create({name: 'alpha'});

  return created;
}

function thenCreated(created: SessionProbe): void {
  const name = created.name;

  expect(name).toBe('alpha');
}

async function runScenario(): Promise<void> {
  const repository = givenRepository();

  const created = await whenCreateProbe(repository);

  thenCreated(created);
}

async function runWithDatabase(routine: () => Promise<void>): Promise<void> {
  const statements = [SESSION_TABLE];

  await withDatabase(statements, routine, SESSION_OPTIONS);
}

describe('withDatabase session cache', () => {
  test('reuses cached session and restores entity storage', async () => {
    await runWithDatabase(runScenario);

    overwriteGlobals();

    await runWithDatabase(runScenario);
  });
});
