import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { app, execute, purgeDatabase, startDatabase } from '../node-database';
import { BaseEntity, Entity, ManyToOne, PrimaryKey, Property, type Ref, refById } from '../../src';

describe('refById helper', () => {
  const DDL_USER = `
    CREATE TABLE "user" (
      "id" SERIAL PRIMARY KEY,
      "email" varchar(255) NOT NULL
    );
  `;

  const DDL_COURSE = `
    CREATE TABLE "course" (
      "id" SERIAL PRIMARY KEY,
      "name" varchar(255) NOT NULL
    );
  `;

  const DDL_USER_LIBRARY = `
    CREATE TABLE "user_library" (
      "id" SERIAL PRIMARY KEY,
      "user_id" integer REFERENCES "user" ("id"),
      "course_id" integer REFERENCES "course" ("id")
    );
  `;

  @Entity()
  class User extends BaseEntity {
    @PrimaryKey()
    id: number;

    @Property()
    email: string;
  }

  @Entity()
  class Course extends BaseEntity {
    @PrimaryKey()
    id: number;

    @Property()
    name: string;
  }

  @Entity()
  class UserLibrary extends BaseEntity {
    @PrimaryKey()
    id: number;

    @ManyToOne(() => User)
    user: Ref<User>;

    @ManyToOne(() => Course)
    course: Ref<Course>;
  }

  beforeEach(async () => {
    await startDatabase();
    await execute(DDL_USER);
    await execute(DDL_COURSE);
    await execute(DDL_USER_LIBRARY);
  });

  afterEach(async () => {
    await purgeDatabase();
    await app?.disconnect();
  });

  it('Given ids only, When creating via refById, Then inserts FKs without extra loads', async () => {
    const user = await User.create({ email: 'user@test.com' });
    const course = await Course.create({ name: 'Perf 101' });

    const created = await UserLibrary.create({
      user: refById(User, user.id),
      course: refById(Course, course.id),
    });

    expect(created).toBeDefined();
    expect(created.id).toBeGreaterThan(0);

    // Load relations when needed
    const loaded = await UserLibrary.findOne({ id: created.id }, { load: ['user', 'course'] });

    expect(loaded).toBeDefined();
    expect(loaded!.user).toBeInstanceOf(User);
    expect(loaded!.course).toBeInstanceOf(Course);
    expect(loaded!.user.id).toBe(user.id);
    expect(loaded!.course.id).toBe(course.id);
  });
});

