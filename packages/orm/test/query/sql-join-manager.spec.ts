import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { app, execute, purgeDatabase, startDatabase } from '../node-database';
import {
  BaseEntity,
  Entity,
  OneToMany,
  ManyToOne,
  PrimaryKey,
  Property,
  Repository,
} from '../../src';

describe('SqlJoinManager - Entity Validation', () => {
  const DDL_PARENT = `
    CREATE TABLE "parent" (
      "id" SERIAL PRIMARY KEY,
      "name" varchar(255) NOT NULL
    );
  `;

  const DDL_CHILD = `
    CREATE TABLE "child" (
      "id" SERIAL PRIMARY KEY,
      "parent_id" integer REFERENCES "parent" ("id"),
      "title" varchar(255) NOT NULL
    );
  `;

  @Entity()
  class Parent extends BaseEntity {
    @PrimaryKey()
    id: number;

    @Property()
    name: string;

    @OneToMany(() => Child, (child) => child.parentId)
    children: Child[];
  }

  @Entity()
  class Child extends BaseEntity {
    @PrimaryKey()
    id: number;

    @Property()
    parentId: number;

    @Property()
    title: string;

    @ManyToOne(() => Parent, (parent) => parent.id)
    parent: Parent;
  }

  class ParentRepository extends Repository<Parent> {
    constructor() {
      super(Parent);
    }
  }

  class ChildRepository extends Repository<Child> {
    constructor() {
      super(Child);
    }
  }

  let parentRepo: ParentRepository;
  let childRepo: ChildRepository;

  beforeEach(async () => {
    await startDatabase();
    await execute(DDL_PARENT);
    await execute(DDL_CHILD);
    parentRepo = new ParentRepository();
    childRepo = new ChildRepository();
  });

  afterEach(async () => {
    await purgeDatabase();
    await app?.disconnect();
  });

  describe('Entity Registration Validation', () => {
    test('should successfully load one-to-many relationship when entity is properly registered', async () => {
      const parent = await parentRepo.create({
        name: 'Parent 1',
      });

      await childRepo.create({
        parentId: parent.id,
        title: 'Child 1',
      });

      await childRepo.create({
        parentId: parent.id,
        title: 'Child 2',
      });

      const found = await parentRepo.findById(parent.id, {
        load: ['children'],
      });

      expect(found).toBeDefined();
      expect(found!.children).toBeDefined();
      expect(found!.children.length).toBe(2);
    });

    test('should successfully load many-to-one relationship when entity is properly registered', async () => {
      const parent = await parentRepo.create({
        name: 'Parent 1',
      });

      const child = await childRepo.create({
        parentId: parent.id,
        title: 'Child 1',
      });

      const found = await childRepo.findById(child.id, {
        load: ['parent'],
      });

      expect(found).toBeDefined();
      expect(found!.parent).toBeDefined();
      expect(found!.parent.name).toBe('Parent 1');
    });

    test('should load multiple one-to-many relationships without LIMIT restriction', async () => {
      const parent = await parentRepo.create({
        name: 'Parent with many children',
      });

      for (let i = 1; i <= 5; i++) {
        await childRepo.create({
          parentId: parent.id,
          title: `Child ${i}`,
        });
      }

      const found = await parentRepo.findById(parent.id, {
        load: ['children'],
      });

      expect(found).toBeDefined();
      expect(found!.children).toBeDefined();
      expect(found!.children.length).toBe(5);
    });
  });

  describe('Load Strategies', () => {
    test('should load relationships with joined strategy (default)', async () => {
      const parent = await parentRepo.create({
        name: 'Parent for joined strategy',
      });

      await childRepo.create({
        parentId: parent.id,
        title: 'Child A',
      });

      await childRepo.create({
        parentId: parent.id,
        title: 'Child B',
      });

      const found = await parentRepo.findById(parent.id, {
        load: ['children'],
        loadStrategy: 'joined',
      });

      expect(found).toBeDefined();
      expect(found!.children).toBeDefined();
      expect(found!.children.length).toBe(2);
    });

    test('should load relationships with select strategy', async () => {
      const parent = await parentRepo.create({
        name: 'Parent for select strategy',
      });

      await childRepo.create({
        parentId: parent.id,
        title: 'Child X',
      });

      await childRepo.create({
        parentId: parent.id,
        title: 'Child Y',
      });

      const found = await parentRepo.findById(parent.id, {
        load: ['children'],
        loadStrategy: 'select',
      });

      expect(found).toBeDefined();
      expect(found!.children).toBeDefined();
      expect(found!.children.length).toBe(2);
    });
  });

  describe('Regression Tests', () => {
    test('should not apply LIMIT when loading one-to-many with joined strategy', async () => {
      const parent = await parentRepo.create({
        name: 'Parent without LIMIT',
      });

      await childRepo.create({
        parentId: parent.id,
        title: 'First Child',
      });

      await childRepo.create({
        parentId: parent.id,
        title: 'Second Child',
      });

      await childRepo.create({
        parentId: parent.id,
        title: 'Third Child',
      });

      const found = await parentRepo.findById(parent.id, {
        load: ['children'],
      });

      expect(found).toBeDefined();
      expect(found!.children.length).toBe(3);
    });

    test('should handle empty one-to-many relationships', async () => {
      const parent = await parentRepo.create({
        name: 'Parent without children',
      });

      const found = await parentRepo.findById(parent.id, {
        load: ['children'],
      });

      expect(found).toBeDefined();
      expect(found!.children).toBeDefined();
      expect(found!.children.length).toBe(0);
    });

    test('should correctly deduplicate joined entities', async () => {
      const parent = await parentRepo.create({
        name: 'Parent for deduplication test',
      });

      await childRepo.create({
        parentId: parent.id,
        title: 'Unique Child 1',
      });

      await childRepo.create({
        parentId: parent.id,
        title: 'Unique Child 2',
      });

      const found = await parentRepo.findById(parent.id, {
        load: ['children'],
      });

      expect(found).toBeDefined();
      expect(found!.children.length).toBe(2);

      const childIds = found!.children.map((c) => c.id);
      const uniqueIds = new Set(childIds);
      expect(uniqueIds.size).toBe(childIds.length);
    });
  });
});
