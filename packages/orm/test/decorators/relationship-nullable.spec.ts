import { describe, expect, test } from 'bun:test';
import path from 'path';
import {
  BaseEntity,
  Entity,
  EntityStorage,
  ManyToOne,
  Orm,
  OrmService,
  PrimaryKey,
  Property,
} from '../../src';

describe('Relationship nullable detection', () => {
  test('should mark optional many-to-one relation as nullable in snapshot', async () => {
    const tempFilePath = path.join(__dirname, 'temp-nullable-relation.entity.ts');

    const entityCode = `
      import { BaseEntity, Entity, ManyToOne, PrimaryKey, Property } from '../../src';

      @Entity()
      export class Course extends BaseEntity {
        @PrimaryKey()
        id: number;

        @Property()
        title: string;
      }

      @Entity()
      export class Lesson extends BaseEntity {
        @PrimaryKey()
        id: number;

        @ManyToOne(() => Course)
        course: Course;
      }

      @Entity()
      export class UserLibrary extends BaseEntity {
        @PrimaryKey()
        id: number;

        @ManyToOne(() => Course)
        course: Course;

        @ManyToOne(() => Lesson)
        lastWatchedLesson?: Lesson;
      }
    `;

    await Bun.write(tempFilePath, entityCode);

    const { UserLibrary } = await import(tempFilePath);

    const ormMock = {
      setConnection: () => undefined,
      connect: async () => undefined,
    } as unknown as Orm;

    const storage = new EntityStorage();
    const service = new OrmService(ormMock, storage, tempFilePath);

    // Override source discovery to limit to the temp entity file
    // @ts-ignore
    service.getSourceFilePaths = () => [tempFilePath];

    await service.onInit({});

    const entityMetadata = storage.get(UserLibrary);
    const snapshot = await storage.snapshot(entityMetadata!);
    const relationColumn = snapshot.columns.find((column) => column.name === 'last_watched_lesson_id');

    expect(relationColumn?.nullable).toBe(true);
  });

  test('should allow explicit nullable option on many-to-one relation', async () => {
    const tempFilePath = path.join(__dirname, 'temp-nullable-relation-with-option.entity.ts');

    const entityCode = `
      import { BaseEntity, Entity, ManyToOne, PrimaryKey, Property } from '../../src';

      @Entity()
      export class Course extends BaseEntity {
        @PrimaryKey()
        id: number;

        @Property()
        title: string;
      }

      @Entity()
      export class Lesson extends BaseEntity {
        @PrimaryKey()
        id: number;

        @ManyToOne(() => Course, { nullable: true })
        course: Course;
      }
    `;

    await Bun.write(tempFilePath, entityCode);

    const { Lesson } = await import(tempFilePath);

    const ormMock = {
      setConnection: () => undefined,
      connect: async () => undefined,
    } as unknown as Orm;

    const storage = new EntityStorage();
    const service = new OrmService(ormMock, storage, tempFilePath);

    // @ts-ignore
    service.getSourceFilePaths = () => [tempFilePath];

    await service.onInit({});

    const entityMetadata = storage.get(Lesson);
    const snapshot = await storage.snapshot(entityMetadata!);
    const relationColumn = snapshot.columns.find((column) => column.name === 'course_id');

    expect(relationColumn?.nullable).toBe(true);
  });
});
