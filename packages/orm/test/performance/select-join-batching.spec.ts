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

/**
 * Performance benchmark test for SelectJoin batching
 * Verifies that N+1 queries are eliminated
 */
describe('SelectJoin Batching Performance (N+1 Fix)', () => {
    beforeEach(async () => {
        await startDatabase();
    });

    afterEach(async () => {
        await purgeDatabase();
        await app?.disconnect();
    });

    test('should batch select join queries instead of N+1', async () => {
        // Setup schema
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

        // Create 2 companies
        const companyA = await Company.create({ id: 1, name: 'Company A' });
        const companyB = await Company.create({ id: 2, name: 'Company B' });

        // Create 50 users (25 per company)
        for (let i = 1; i <= 50; i++) {
            await User.create({
                id: i,
                name: `User ${i}`,
                companyId: i % 2 === 0 ? companyA.id : companyB.id,
            });
        }

        // Track SQL queries executed
        let queryCount = 0;
        const queries: string[] = [];

        const originalExecute = app.driver.executeStatement.bind(app.driver);
        app.driver.executeStatement = async (statement: any) => {
            queryCount++;
            queries.push(statement.statement === 'select' ? `SELECT FROM ${statement.table}` : 'OTHER');
            return originalExecute(statement);
        };

        // Execute findAll with load - this should use batching
        const users = await User.findAll({ load: ['company'] });

        // Restore original
        app.driver.executeStatement = originalExecute;

        // Verify results
        expect(users).toHaveLength(50);
        expect(users.every(u => u.company)).toBe(true);

        // CRITICAL: Should be 2 queries (1 main SELECT users + 1 BATCHED SELECT companies)
        // NOT 51 queries (1 main + 50 individual company SELECTs)
        expect(queryCount).toBeLessThanOrEqual(2);

        console.log(`✅ Query count: ${queryCount} (Expected: 2, Would be 51 without batching)`);
    });

    test('should correctly load relationships with batching', async () => {
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
});
