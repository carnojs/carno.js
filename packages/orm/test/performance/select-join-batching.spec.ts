import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { app, execute, purgeDatabase, startDatabase } from '../node-database';
import { BaseEntity, Entity, PrimaryKey, Property, ManyToOne } from '../../src';

@Entity()
class Company extends BaseEntity {
  @PrimaryKey()
  id: number;

  @Property()
  name: string;
}

@Entity()
class User extends BaseEntity {
  @PrimaryKey()
  id: number;

  @Property()
  name: string;

  @Property()
  companyId: number;

  @ManyToOne(() => Company)
  company: Company;
}


describe('SelectJoin Batching (N+1 Fix)', () => {
  beforeEach(async () => {
    await startDatabase();
  });

  afterEach(async () => {
    await purgeDatabase();
    await app?.disconnect();
  });

  test('should correctly load ManyToOne relationships with multiple entities', async () => {
    await execute(`
      CREATE TABLE "company" (
        "id" SERIAL PRIMARY KEY,
        "name" varchar(255) NOT NULL
      );
    `);

    await execute(`
      CREATE TABLE "user" (
        "id" SERIAL PRIMARY KEY,
        "name" varchar(255) NOT NULL,
        "company_id" integer REFERENCES "company"("id")
      );
    `);

    const companyA = await Company.create({ id: 1, name: 'TechCorp' });
    const companyB = await Company.create({ id: 2, name: 'StartupInc' });

    await User.create({ id: 1, name: 'Alice', companyId: companyA.id });
    await User.create({ id: 2, name: 'Bob', companyId: companyB.id });
    await User.create({ id: 3, name: 'Charlie', companyId: companyA.id });

    const users = await User.findAll({ load: ['company'] });

    expect(users).toHaveLength(3);

    const alice = users.find(u => u.name === 'Alice');
    const bob = users.find(u => u.name === 'Bob');
    const charlie = users.find(u => u.name === 'Charlie');

    expect(alice!.company.name).toBe('TechCorp');
    expect(bob!.company.name).toBe('StartupInc');
    expect(charlie!.company.name).toBe('TechCorp');
  });

  test('should load many entities with shared relationships efficiently', async () => {
    await execute(`
      CREATE TABLE "company" (
        "id" SERIAL PRIMARY KEY,
        "name" varchar(255) NOT NULL
      );
    `);

    await execute(`
      CREATE TABLE "user" (
        "id" SERIAL PRIMARY KEY,
        "name" varchar(255) NOT NULL,
        "company_id" integer REFERENCES "company"("id")
      );
    `);

    const companyA = await Company.create({ id: 1, name: 'Company A' });
    const companyB = await Company.create({ id: 2, name: 'Company B' });

    for (let i = 1; i <= 20; i++) {
      await User.create({
        id: i,
        name: `User ${i}`,
        companyId: i % 2 === 0 ? companyA.id : companyB.id,
      });
    }

    const users = await User.findAll({ load: ['company'] });

    expect(users).toHaveLength(20);
    expect(users.every(u => u.company)).toBe(true);
    expect(users.every(u => u.company.name === 'Company A' || u.company.name === 'Company B')).toBe(true);

    const usersWithCompanyA = users.filter(u => u.company.name === 'Company A');
    const usersWithCompanyB = users.filter(u => u.company.name === 'Company B');
    expect(usersWithCompanyA).toHaveLength(10);
    expect(usersWithCompanyB).toHaveLength(10);
  });
});
