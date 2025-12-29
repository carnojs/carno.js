import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { app, execute, purgeDatabase, startDatabase } from '../node-database';
import {
  BaseEntity,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property,
} from '../../src';
import { identityMapContext } from '../../src/identity-map';

describe('Identity Map Advanced Integration', () => {
  const DDL_COMPANY = `
    CREATE TABLE "company" (
      "id" SERIAL PRIMARY KEY,
      "name" varchar(255) NOT NULL
    );
  `;

  const DDL_DEPARTMENT = `
    CREATE TABLE "department" (
      "id" SERIAL PRIMARY KEY,
      "name" varchar(255) NOT NULL,
      "company_id" integer REFERENCES "company" ("id")
    );
  `;

  const DDL_EMPLOYEE = `
    CREATE TABLE "employee" (
      "id" SERIAL PRIMARY KEY,
      "name" varchar(255) NOT NULL,
      "department_id" integer REFERENCES "department" ("id"),
      "manager_id" integer REFERENCES "employee" ("id")
    );
  `;

  const DDL_PROFILE = `
    CREATE TABLE "profile" (
      "id" SERIAL PRIMARY KEY,
      "bio" text,
      "employee_id" integer UNIQUE REFERENCES "employee" ("id")
    );
  `;

  const DDL_PROJECT = `
    CREATE TABLE "project" (
      "id" SERIAL PRIMARY KEY,
      "name" varchar(255) NOT NULL,
      "lead_id" integer REFERENCES "employee" ("id")
    );
  `;

  const DDL_TASK = `
    CREATE TABLE "task" (
      "id" SERIAL PRIMARY KEY,
      "title" varchar(255) NOT NULL,
      "project_id" integer REFERENCES "project" ("id"),
      "assignee_id" integer REFERENCES "employee" ("id")
    );
  `;

  @Entity()
  class Company extends BaseEntity {
    @PrimaryKey()
    id: number;

    @Property()
    name: string;

    @OneToMany(() => Department, (d) => d.companyId)
    departments: Department[];
  }

  @Entity()
  class Department extends BaseEntity {
    @PrimaryKey()
    id: number;

    @Property()
    name: string;

    @Property()
    companyId: number;

    @ManyToOne(() => Company)
    company: Company;

    @OneToMany(() => Employee, (e) => e.departmentId)
    employees: Employee[];
  }

  @Entity()
  class Employee extends BaseEntity {
    @PrimaryKey()
    id: number;

    @Property()
    name: string;

    @Property()
    departmentId: number;

    @Property()
    managerId: number | null;

    @ManyToOne(() => Department)
    department: Department;

    @ManyToOne(() => Employee)
    manager: Employee | null;

    @OneToMany(() => Employee, (e) => e.managerId)
    subordinates: Employee[];

    @OneToMany(() => Task, (t) => t.assigneeId)
    tasks: Task[];
  }

  @Entity()
  class Profile extends BaseEntity {
    @PrimaryKey()
    id: number;

    @Property()
    bio: string;

    @Property()
    employeeId: number;

    @ManyToOne(() => Employee)
    employee: Employee;
  }

  @Entity()
  class Project extends BaseEntity {
    @PrimaryKey()
    id: number;

    @Property()
    name: string;

    @Property()
    leadId: number;

    @ManyToOne(() => Employee)
    lead: Employee;

    @OneToMany(() => Task, (t) => t.projectId)
    tasks: Task[];
  }

  @Entity()
  class Task extends BaseEntity {
    @PrimaryKey()
    id: number;

    @Property()
    title: string;

    @Property()
    projectId: number;

    @Property()
    assigneeId: number;

    @ManyToOne(() => Project)
    project: Project;

    @ManyToOne(() => Employee)
    assignee: Employee;
  }

  beforeEach(async () => {
    await startDatabase();
    await execute(DDL_COMPANY);
    await execute(DDL_DEPARTMENT);
    await execute(DDL_EMPLOYEE);
    await execute(DDL_PROFILE);
    await execute(DDL_PROJECT);
    await execute(DDL_TASK);
  });

  afterEach(async () => {
    await purgeDatabase();
    await app?.disconnect();
  });

  describe('Deep Nested Relationships', () => {
    test('When loading 3-level hierarchy, Then caches all entities', async () => {
      await identityMapContext.run(async () => {
        // Given
        await Company.create({ id: 1, name: 'Acme Corp' });
        await Department.create({ id: 1, name: 'Engineering', companyId: 1 });
        await Employee.create({
          id: 1,
          name: 'John',
          departmentId: 1,
          managerId: null,
        });

        // When
        const employee = await Employee.findOne(
          { id: 1 },
          { load: ['department'] }
        );
        const department = await Department.findOne(
          { id: 1 },
          { load: ['company'] }
        );
        const company = await Company.findOne({ id: 1 });

        // Then
        expect(employee?.department).toBe(department);
        expect(department?.company).toBe(company);
      });
    });

    test('When loading via different paths, Then uses cached instances', async () => {
      await identityMapContext.run(async () => {
        // Given
        await Company.create({ id: 1, name: 'Acme Corp' });
        await Department.create({ id: 1, name: 'Engineering', companyId: 1 });
        await Department.create({ id: 2, name: 'Sales', companyId: 1 });

        // When
        const dept1 = await Department.findOne(
          { id: 1 },
          { load: ['company'] }
        );
        const dept2 = await Department.findOne(
          { id: 2 },
          { load: ['company'] }
        );

        // Then
        expect(dept1?.company).toBe(dept2?.company);
      });
    });
  });

  describe('Self-Referencing Entities', () => {
    test('When employee has manager, Then manager is cached', async () => {
      await identityMapContext.run(async () => {
        // Given
        await Company.create({ id: 1, name: 'Acme Corp' });
        await Department.create({ id: 1, name: 'Engineering', companyId: 1 });
        await Employee.create({
          id: 1,
          name: 'Manager',
          departmentId: 1,
          managerId: null,
        });
        await Employee.create({
          id: 2,
          name: 'Developer',
          departmentId: 1,
          managerId: 1,
        });

        // When
        const manager = await Employee.findOne({ id: 1 });
        const developer = await Employee.findOne(
          { id: 2 },
          { load: ['manager'] }
        );

        // Then
        expect(developer?.manager).toBe(manager);
      });
    });

    test('When multiple employees have same manager, Then share instance', async () => {
      await identityMapContext.run(async () => {
        // Given
        await Company.create({ id: 1, name: 'Acme Corp' });
        await Department.create({ id: 1, name: 'Engineering', companyId: 1 });
        await Employee.create({
          id: 1,
          name: 'Manager',
          departmentId: 1,
          managerId: null,
        });
        await Employee.create({
          id: 2,
          name: 'Dev1',
          departmentId: 1,
          managerId: 1,
        });
        await Employee.create({
          id: 3,
          name: 'Dev2',
          departmentId: 1,
          managerId: 1,
        });

        // When
        const dev1 = await Employee.findOne({ id: 2 }, { load: ['manager'] });
        const dev2 = await Employee.findOne({ id: 3 }, { load: ['manager'] });

        // Then
        expect(dev1?.manager).toBe(dev2?.manager);
        expect(dev1?.manager?.name).toBe('Manager');
      });
    });
  });

  describe('Multiple Entity Types', () => {
    test('When loading project with lead and tasks, Then caches employees', async () => {
      await identityMapContext.run(async () => {
        // Given
        await Company.create({ id: 1, name: 'Acme Corp' });
        await Department.create({ id: 1, name: 'Engineering', companyId: 1 });
        await Employee.create({
          id: 1,
          name: 'Lead',
          departmentId: 1,
          managerId: null,
        });
        await Employee.create({
          id: 2,
          name: 'Dev',
          departmentId: 1,
          managerId: 1,
        });
        await Project.create({ id: 1, name: 'Project X', leadId: 1 });
        await Task.create({
          id: 1,
          title: 'Task 1',
          projectId: 1,
          assigneeId: 1,
        });
        await Task.create({
          id: 2,
          title: 'Task 2',
          projectId: 1,
          assigneeId: 2,
        });

        // When
        const project = await Project.findOne({ id: 1 }, { load: ['lead'] });
        const task1 = await Task.findOne({ id: 1 }, { load: ['assignee'] });

        // Then
        expect(project?.lead).toBe(task1?.assignee);
      });
    });

    test('When entity appears in multiple relationships, Then cached', async () => {
      await identityMapContext.run(async () => {
        // Given
        await Company.create({ id: 1, name: 'Acme Corp' });
        await Department.create({ id: 1, name: 'Engineering', companyId: 1 });
        await Employee.create({
          id: 1,
          name: 'Dev',
          departmentId: 1,
          managerId: null,
        });
        await Project.create({ id: 1, name: 'Project X', leadId: 1 });
        await Task.create({
          id: 1,
          title: 'Task 1',
          projectId: 1,
          assigneeId: 1,
        });

        // When
        const employee = await Employee.findOne({ id: 1 });
        const project = await Project.findOne({ id: 1 }, { load: ['lead'] });
        const task = await Task.findOne({ id: 1 }, { load: ['assignee'] });

        // Then
        expect(employee).toBe(project?.lead);
        expect(employee).toBe(task?.assignee);
        expect(project?.lead).toBe(task?.assignee);
      });
    });
  });

  describe('Bulk Operations', () => {
    test('When findAll returns entities, Then subsequent finds use cache', async () => {
      await identityMapContext.run(async () => {
        // Given
        await Company.create({ id: 1, name: 'Acme Corp' });
        await Department.create({ id: 1, name: 'Engineering', companyId: 1 });
        for (let i = 1; i <= 10; i++) {
          await Employee.create({
            id: i,
            name: `Employee ${i}`,
            departmentId: 1,
            managerId: null,
          });
        }

        // When
        const allEmployees = await Employee.findAll({});
        const employee5 = await Employee.findOne({ id: 5 });
        const employee8 = await Employee.findOne({ id: 8 });

        // Then
        expect(allEmployees[4]).toBe(employee5);
        expect(allEmployees[7]).toBe(employee8);
      });
    });

    test('When loading relationships in bulk, Then caches all', async () => {
      await identityMapContext.run(async () => {
        // Given
        await Company.create({ id: 1, name: 'Acme Corp' });
        await Department.create({ id: 1, name: 'Engineering', companyId: 1 });
        await Employee.create({
          id: 1,
          name: 'Employee 1',
          departmentId: 1,
          managerId: null,
        });
        await Employee.create({
          id: 2,
          name: 'Employee 2',
          departmentId: 1,
          managerId: null,
        });
        await Employee.create({
          id: 3,
          name: 'Employee 3',
          departmentId: 1,
          managerId: null,
        });

        // When
        const department = await Department.findOne({ id: 1 });
        const emp1 = await Employee.findOne(
          { id: 1 },
          { load: ['department'] }
        );
        const emp2 = await Employee.findOne(
          { id: 2 },
          { load: ['department'] }
        );
        const emp3 = await Employee.findOne(
          { id: 3 },
          { load: ['department'] }
        );

        // Then
        expect(emp1?.department).toBe(department);
        expect(emp2?.department).toBe(department);
        expect(emp3?.department).toBe(department);
      });
    });
  });

  describe('Entity Modification Propagation', () => {
    test('When modifying cached entity, Then all refs see changes', async () => {
      await identityMapContext.run(async () => {
        // Given
        await Company.create({ id: 1, name: 'Acme Corp' });
        await Department.create({ id: 1, name: 'Engineering', companyId: 1 });
        await Employee.create({
          id: 1,
          name: 'Dev',
          departmentId: 1,
          managerId: null,
        });
        await Project.create({ id: 1, name: 'Project X', leadId: 1 });
        await Task.create({
          id: 1,
          title: 'Task 1',
          projectId: 1,
          assigneeId: 1,
        });

        // When
        const employee = await Employee.findOne({ id: 1 });
        const project = await Project.findOne({ id: 1 }, { load: ['lead'] });
        const task = await Task.findOne({ id: 1 }, { load: ['assignee'] });

        employee!.name = 'Updated Dev';

        // Then
        expect(project?.lead?.name).toBe('Updated Dev');
        expect(task?.assignee?.name).toBe('Updated Dev');
      });
    });

    test('When modifying parent entity, Then children reflect change', async () => {
      await identityMapContext.run(async () => {
        // Given
        await Company.create({ id: 1, name: 'Acme Corp' });
        await Department.create({ id: 1, name: 'Engineering', companyId: 1 });
        await Department.create({ id: 2, name: 'Sales', companyId: 1 });

        // When
        const company = await Company.findOne({ id: 1 });
        const dept1 = await Department.findOne(
          { id: 1 },
          { load: ['company'] }
        );
        const dept2 = await Department.findOne(
          { id: 2 },
          { load: ['company'] }
        );

        company!.name = 'Acme Corporation';

        // Then
        expect(dept1?.company?.name).toBe('Acme Corporation');
        expect(dept2?.company?.name).toBe('Acme Corporation');
      });
    });
  });

  describe('Loading Strategies Consistency', () => {
    test('When mixing joined and select strategies, Then same instances', async () => {
      await identityMapContext.run(async () => {
        // Given
        await Company.create({ id: 1, name: 'Acme Corp' });
        await Department.create({ id: 1, name: 'Engineering', companyId: 1 });
        await Employee.create({
          id: 1,
          name: 'Dev',
          departmentId: 1,
          managerId: null,
        });

        // When
        const empJoined = await Employee.findOne(
          { id: 1 },
          { load: ['department'], loadStrategy: 'joined' }
        );
        const empSelect = await Employee.findOne(
          { id: 1 },
          { load: ['department'], loadStrategy: 'select' }
        );
        const department = await Department.findOne({ id: 1 });

        // Then
        expect(empJoined).toBe(empSelect);
        expect(empJoined?.department).toBe(department);
        expect(empSelect?.department).toBe(department);
      });
    });
  });

  describe('Complex Query Patterns', () => {
    test('When querying with different filters, Then same entities cached', async () => {
      await identityMapContext.run(async () => {
        // Given
        await Company.create({ id: 1, name: 'Acme Corp' });
        await Department.create({ id: 1, name: 'Engineering', companyId: 1 });
        await Employee.create({
          id: 1,
          name: 'John',
          departmentId: 1,
          managerId: null,
        });

        // When
        const byId = await Employee.findOne({ id: 1 });
        const byName = await Employee.findOne({ name: 'John' });

        // Then
        expect(byId).toBe(byName);
      });
    });

    test('When querying subset and full set, Then entities consistent', async () => {
      await identityMapContext.run(async () => {
        // Given
        await Company.create({ id: 1, name: 'Acme Corp' });
        await Department.create({ id: 1, name: 'Engineering', companyId: 1 });
        await Employee.create({
          id: 1,
          name: 'John',
          departmentId: 1,
          managerId: null,
        });
        await Employee.create({
          id: 2,
          name: 'Jane',
          departmentId: 1,
          managerId: null,
        });
        await Employee.create({
          id: 3,
          name: 'Bob',
          departmentId: 1,
          managerId: null,
        });

        // When
        const john = await Employee.findOne({ name: 'John' });
        const allEmployees = await Employee.findAll({});

        // Then
        const johnFromAll = allEmployees.find((e) => e.name === 'John');
        expect(john).toBe(johnFromAll);
      });
    });
  });

  describe('Context Isolation', () => {
    test('When nesting contexts, Then outer context unchanged', async () => {
      // Given
      await Company.create({ id: 1, name: 'Acme Corp' });

      let outerCompany: Company | null = null;
      let innerCompany: Company | null = null;

      // When
      await identityMapContext.run(async () => {
        outerCompany = await Company.findOne({ id: 1 });

        await identityMapContext.run(async () => {
          innerCompany = await Company.findOne({ id: 1 });
        });

        const afterInner = await Company.findOne({ id: 1 });
        expect(outerCompany).toBe(afterInner);
      });

      // Then
      expect(outerCompany).not.toBe(innerCompany);
    });

    test('When parallel contexts, Then completely isolated', async () => {
      // Given
      await Company.create({ id: 1, name: 'Acme Corp' });

      const results: Company[] = [];

      // When
      await Promise.all([
        identityMapContext.run(async () => {
          const company = await Company.findOne({ id: 1 });
          results.push(company!);
        }),
        identityMapContext.run(async () => {
          const company = await Company.findOne({ id: 1 });
          results.push(company!);
        }),
        identityMapContext.run(async () => {
          const company = await Company.findOne({ id: 1 });
          results.push(company!);
        }),
      ]);

      // Then
      expect(results[0]).not.toBe(results[1]);
      expect(results[1]).not.toBe(results[2]);
      expect(results[0]).not.toBe(results[2]);
    });
  });

  describe('Edge Cases', () => {
    test('When entity has null relationship, Then handles gracefully', async () => {
      await identityMapContext.run(async () => {
        // Given
        await Company.create({ id: 1, name: 'Acme Corp' });
        await Department.create({ id: 1, name: 'Engineering', companyId: 1 });
        await Employee.create({
          id: 1,
          name: 'Dev',
          departmentId: 1,
          managerId: null,
        });

        // When
        const employee = await Employee.findOne({ id: 1 });

        // Then
        expect(employee).toBeDefined();
        expect(employee?.managerId).toBeNull();
      });
    });

    test('When same entity loaded with different relations, Then cached', async () => {
      await identityMapContext.run(async () => {
        // Given
        await Company.create({ id: 1, name: 'Acme Corp' });
        await Department.create({ id: 1, name: 'Engineering', companyId: 1 });
        await Employee.create({
          id: 1,
          name: 'Dev',
          departmentId: 1,
          managerId: null,
        });

        // When
        const emp1 = await Employee.findOne({ id: 1 });
        const emp2 = await Employee.findOne(
          { id: 1 },
          { load: ['department'] }
        );

        // Then
        expect(emp1).toBe(emp2);
      });
    });

    test('When entity not found, Then returns undefined without caching', async () => {
      await identityMapContext.run(async () => {
        // Given
        await Company.create({ id: 1, name: 'Acme Corp' });
        await Department.create({ id: 1, name: 'Engineering', companyId: 1 });

        // When
        const nonExistent = await Employee.findOne({ id: 999 });
        const alsoNonExistent = await Employee.findOne({ id: 999 });

        // Then
        expect(nonExistent).toBeUndefined();
        expect(alsoNonExistent).toBeUndefined();
      });
    });
  });

  describe('Create and Query in Same Context', () => {
    test('When creating and querying entity, Then uses cache', async () => {
      await identityMapContext.run(async () => {
        // When
        const created = await Company.create({ id: 1, name: 'Acme Corp' });
        const queried = await Company.findOne({ id: 1 });

        // Then
        expect(created).toBe(queried);
      });
    });

    test('When creating related entities, Then relationships cached', async () => {
      await identityMapContext.run(async () => {
        // When
        const company = await Company.create({ id: 1, name: 'Acme Corp' });
        const department = await Department.create({
          id: 1,
          name: 'Engineering',
          companyId: 1,
        });

        const loadedDept = await Department.findOne(
          { id: 1 },
          { load: ['company'] }
        );

        // Then
        expect(loadedDept?.company).toBe(company);
      });
    });
  });
});
