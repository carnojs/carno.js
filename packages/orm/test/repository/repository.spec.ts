import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { app, execute, purgeDatabase, startDatabase } from '../node-database';
import {
  BaseEntity,
  Entity,
  OneToMany,
  PrimaryKey,
  Property,
  Repository,
} from '../../src';

describe('Repository Pattern', () => {
  const DDL_COURSE = `
    CREATE TABLE "course" (
      "id" SERIAL PRIMARY KEY,
      "name" varchar(255) NOT NULL,
      "description" text,
      "is_active" boolean DEFAULT true,
      "created_at" timestamp DEFAULT NOW()
    );
  `;

  const DDL_LESSON = `
    CREATE TABLE "lesson" (
      "id" SERIAL PRIMARY KEY,
      "course_id" integer REFERENCES "course" ("id"),
      "title" varchar(255) NOT NULL,
      "content" text,
      "order_index" integer DEFAULT 0,
      "is_published" boolean DEFAULT false,
      "created_at" timestamp DEFAULT NOW()
    );
  `;

  @Entity()
  class Course extends BaseEntity {
    @PrimaryKey()
    id: number;

    @Property()
    name: string;

    @Property()
    description: string;

    @Property()
    isActive: boolean;

    @Property()
    createdAt: Date;

    @OneToMany(() => Lesson, (lesson) => lesson.courseId)
    lessons: Lesson[];
  }

  @Entity()
  class Lesson extends BaseEntity {
    @PrimaryKey()
    id: number;

    @Property()
    courseId: number;

    @Property()
    title: string;

    @Property()
    content: string;

    @Property()
    orderIndex: number;

    @Property()
    isPublished: boolean;

    @Property()
    createdAt: Date;
  }

  class CourseRepository extends Repository<Course> {
    constructor() {
      super(Course);
    }

    async findActive(): Promise<Course[]> {
      return this.find({
        where: { isActive: true },
        orderBy: { createdAt: 'DESC' },
      });
    }

    async findByName(name: string): Promise<Course | undefined> {
      return this.findOne({
        where: { name },
      });
    }
  }

  class LessonRepository extends Repository<Lesson> {
    constructor() {
      super(Lesson);
    }

    async findByCourse(courseId: number): Promise<Lesson[]> {
      return this.find({
        where: { courseId },
        orderBy: { orderIndex: 'ASC' },
      });
    }

    async findPublishedByCourse(courseId: number): Promise<Lesson[]> {
      return this.find({
        where: { courseId, isPublished: true },
        orderBy: { orderIndex: 'ASC' },
      });
    }

    async countPublishedByCourse(courseId: number): Promise<number> {
      return this.count({ courseId, isPublished: true });
    }
  }

  let courseRepo: CourseRepository;
  let lessonRepo: LessonRepository;

  beforeEach(async () => {
    console.log('Preparing repository tests...');
    await startDatabase();
    await execute(DDL_COURSE);
    await execute(DDL_LESSON);
    courseRepo = new CourseRepository();
    lessonRepo = new LessonRepository();
    console.log('Repository tests prepared!');
  });

  afterEach(async () => {
    await purgeDatabase();
      await app?.disconnect();
  });

  describe('CREATE operations', () => {
    test('should create a course', async () => {
      const course = await courseRepo.create({
        name: 'TypeScript Advanced',
        description: 'Learn TypeScript from zero to hero',
        isActive: true,
      });

      expect(course).toBeDefined();
      expect(course.id).toBeGreaterThan(0);
      expect(course.name).toBe('TypeScript Advanced');
      expect(course.description).toBe('Learn TypeScript from zero to hero');
      expect(course.isActive).toBe(true);
    });

    test('should create a lesson', async () => {
      const course = await courseRepo.create({
        name: 'Course 1',
        description: 'Description 1',
      });

      const lesson = await lessonRepo.create({
        courseId: course.id,
        title: 'Introduction to TypeScript',
        content: 'Lesson content...',
        orderIndex: 0,
        isPublished: true,
      });

      expect(lesson).toBeDefined();
      expect(lesson.id).toBeGreaterThan(0);
      expect(lesson.courseId).toBe(course.id);
      expect(lesson.title).toBe('Introduction to TypeScript');
      expect(lesson.orderIndex).toBe(0);
      expect(lesson.isPublished).toBe(true);
    });
  });

  describe('READ operations', () => {
    test('should find course by id', async () => {
      const created = await courseRepo.create({
        name: 'Test Course',
        description: 'Test Description',
      });

      const found = await courseRepo.findById(created.id);

      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
      expect(found!.name).toBe('Test Course');
    });

    test('should return undefined when course not found by id', async () => {
      const found = await courseRepo.findById(9999);

      expect(found).toBeUndefined();
    });

    test('should find course by id or fail', async () => {
      const created = await courseRepo.create({
        name: 'Test Course',
        description: 'Test Description',
      });

      const found = await courseRepo.findByIdOrFail(created.id);

      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
    });

    test('should throw error when course not found by id or fail', async () => {
      expect(async () => {
        await courseRepo.findByIdOrFail(9999);
      }).toThrow();
    });

    test('should find courses with filters', async () => {
      await courseRepo.create({
        name: 'Active Course 1',
        description: 'Description 1',
        isActive: true,
      });

      await courseRepo.create({
        name: 'Inactive Course',
        description: 'Description 2',
        isActive: false,
      });

      await courseRepo.create({
        name: 'Active Course 2',
        description: 'Description 3',
        isActive: true,
      });

      const activeCourses = await courseRepo.findActive();

      expect(activeCourses).toBeDefined();
      expect(activeCourses.length).toBe(2);
      expect(activeCourses.every((c) => c.isActive)).toBe(true);
    });

    test('should find one course', async () => {
      await courseRepo.create({
        name: 'Unique Course',
        description: 'Description',
      });

      const found = await courseRepo.findByName('Unique Course');

      expect(found).toBeDefined();
      expect(found!.name).toBe('Unique Course');
    });

    test('should return undefined when findOne does not match', async () => {
      const found = await courseRepo.findByName('Non Existent');

      expect(found).toBeUndefined();
    });

    test('should find all courses', async () => {
      await courseRepo.create({ name: 'Course 1', description: 'Desc 1' });
      await courseRepo.create({ name: 'Course 2', description: 'Desc 2' });
      await courseRepo.create({ name: 'Course 3', description: 'Desc 3' });

      const all = await courseRepo.findAll();

      expect(all).toBeDefined();
      expect(all.length).toBe(3);
    });

    test('should find all courses with limit', async () => {
      await courseRepo.create({ name: 'Course 1', description: 'Desc 1' });
      await courseRepo.create({ name: 'Course 2', description: 'Desc 2' });
      await courseRepo.create({ name: 'Course 3', description: 'Desc 3' });

      const limited = await courseRepo.findAll({ limit: 2 });

      expect(limited).toBeDefined();
      expect(limited.length).toBe(2);
    });

    test('should find lessons by course', async () => {
      const course = await courseRepo.create({
        name: 'Course with Lessons',
        description: 'Description',
      });

      await lessonRepo.create({
        courseId: course.id,
        title: 'Lesson 1',
        content: 'Content 1',
        orderIndex: 0,
      });

      await lessonRepo.create({
        courseId: course.id,
        title: 'Lesson 2',
        content: 'Content 2',
        orderIndex: 1,
      });

      const lessons = await lessonRepo.findByCourse(course.id);

      expect(lessons).toBeDefined();
      expect(lessons.length).toBe(2);
      expect(lessons[0].orderIndex).toBe(0);
      expect(lessons[1].orderIndex).toBe(1);
    });

    test('should find only published lessons', async () => {
      const course = await courseRepo.create({
        name: 'Course',
        description: 'Description',
      });

      await lessonRepo.create({
        courseId: course.id,
        title: 'Published Lesson',
        content: 'Content',
        orderIndex: 0,
        isPublished: true,
      });

      await lessonRepo.create({
        courseId: course.id,
        title: 'Draft Lesson',
        content: 'Content',
        orderIndex: 1,
        isPublished: false,
      });

      const publishedLessons = await lessonRepo.findPublishedByCourse(
        course.id
      );

      expect(publishedLessons).toBeDefined();
      expect(publishedLessons.length).toBe(1);
      expect(publishedLessons[0].isPublished).toBe(true);
    });
  });

  describe('UPDATE operations', () => {
    test('should update course by id', async () => {
      const course = await courseRepo.create({
        name: 'Original Name',
        description: 'Original Description',
      });

      await courseRepo.updateById(course.id, {
        name: 'Updated Name',
      });

      const updated = await courseRepo.findById(course.id);

      expect(updated).toBeDefined();
      expect(updated!.name).toBe('Updated Name');
      expect(updated!.description).toBe('Original Description');
    });

    test('should update multiple courses', async () => {
      await courseRepo.create({
        name: 'Course 1',
        description: 'Desc 1',
        isActive: false,
      });

      await courseRepo.create({
        name: 'Course 2',
        description: 'Desc 2',
        isActive: false,
      });

      await courseRepo.update({ isActive: false }, { isActive: true });

      const updated = await courseRepo.find({
        where: { isActive: true },
      });

      expect(updated.length).toBe(2);
    });

    test('should update lesson', async () => {
      const course = await courseRepo.create({
        name: 'Course',
        description: 'Description',
      });

      const lesson = await lessonRepo.create({
        courseId: course.id,
        title: 'Draft Lesson',
        content: 'Content',
        isPublished: false,
      });

      await lessonRepo.updateById(lesson.id, {
        isPublished: true,
      });

      const updated = await lessonRepo.findById(lesson.id);

      expect(updated).toBeDefined();
      expect(updated!.isPublished).toBe(true);
    });
  });

  describe('COUNT and EXISTS operations', () => {
    test('should count courses', async () => {
      await courseRepo.create({ name: 'Course 1', description: 'Desc 1' });
      await courseRepo.create({ name: 'Course 2', description: 'Desc 2' });
      await courseRepo.create({ name: 'Course 3', description: 'Desc 3' });

      const count = await courseRepo.count();

      expect(count).toBe(3);
    });

    test('should count courses with filter', async () => {
      await courseRepo.create({
        name: 'Active 1',
        description: 'Desc',
        isActive: true,
      });

      await courseRepo.create({
        name: 'Inactive',
        description: 'Desc',
        isActive: false,
      });

      await courseRepo.create({
        name: 'Active 2',
        description: 'Desc',
        isActive: true,
      });

      const activeCount = await courseRepo.count({ isActive: true });

      expect(activeCount).toBe(2);
    });

    test('should count published lessons', async () => {
      const course = await courseRepo.create({
        name: 'Course',
        description: 'Description',
      });

      await lessonRepo.create({
        courseId: course.id,
        title: 'Lesson 1',
        content: 'Content',
        isPublished: true,
      });

      await lessonRepo.create({
        courseId: course.id,
        title: 'Lesson 2',
        content: 'Content',
        isPublished: false,
      });

      await lessonRepo.create({
        courseId: course.id,
        title: 'Lesson 3',
        content: 'Content',
        isPublished: true,
      });

      const count = await lessonRepo.countPublishedByCourse(course.id);

      expect(count).toBe(2);
    });

    test('should check if course exists', async () => {
      const course = await courseRepo.create({
        name: 'Existing Course',
        description: 'Description',
      });

      const exists = await courseRepo.exists({ id: course.id });
      const notExists = await courseRepo.exists({ id: 9999 });

      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });

    test('should check if course exists by name', async () => {
      await courseRepo.create({
        name: 'Unique Name',
        description: 'Description',
      });

      const exists = await courseRepo.exists({ name: 'Unique Name' });
      const notExists = await courseRepo.exists({ name: 'Non Existent' });

      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });
  });

  describe('ORDERING operations', () => {
    test('should order courses by name ascending', async () => {
      await courseRepo.create({ name: 'Zebra', description: 'Desc' });
      await courseRepo.create({ name: 'Alpha', description: 'Desc' });
      await courseRepo.create({ name: 'Beta', description: 'Desc' });

      const ordered = await courseRepo.find({
        orderBy: { name: 'ASC' },
      });

      expect(ordered[0].name).toBe('Alpha');
      expect(ordered[1].name).toBe('Beta');
      expect(ordered[2].name).toBe('Zebra');
    });

    test('should order courses by name descending', async () => {
      await courseRepo.create({ name: 'Zebra', description: 'Desc' });
      await courseRepo.create({ name: 'Alpha', description: 'Desc' });
      await courseRepo.create({ name: 'Beta', description: 'Desc' });

      const ordered = await courseRepo.find({
        orderBy: { name: 'DESC' },
      });

      expect(ordered[0].name).toBe('Zebra');
      expect(ordered[1].name).toBe('Beta');
      expect(ordered[2].name).toBe('Alpha');
    });

    test('should order lessons by orderIndex', async () => {
      const course = await courseRepo.create({
        name: 'Course',
        description: 'Description',
      });

      await lessonRepo.create({
        courseId: course.id,
        title: 'Lesson 3',
        content: 'Content',
        orderIndex: 2,
      });

      await lessonRepo.create({
        courseId: course.id,
        title: 'Lesson 1',
        content: 'Content',
        orderIndex: 0,
      });

      await lessonRepo.create({
        courseId: course.id,
        title: 'Lesson 2',
        content: 'Content',
        orderIndex: 1,
      });

      const ordered = await lessonRepo.findByCourse(course.id);

      expect(ordered[0].orderIndex).toBe(0);
      expect(ordered[1].orderIndex).toBe(1);
      expect(ordered[2].orderIndex).toBe(2);
    });
  });

  describe('PAGINATION operations', () => {
    beforeEach(async () => {
      for (let i = 1; i <= 10; i++) {
        await courseRepo.create({
          name: `Course ${i}`,
          description: `Description ${i}`,
        });
      }
    });

    test('should limit results', async () => {
      const limited = await courseRepo.find({
        limit: 5,
      });

      expect(limited.length).toBe(5);
    });

    test('should offset results', async () => {
      const firstPage = await courseRepo.find({
        limit: 3,
        offset: 0,
        orderBy: { id: 'ASC' },
      });

      const secondPage = await courseRepo.find({
        limit: 3,
        offset: 3,
        orderBy: { id: 'ASC' },
      });

      expect(firstPage.length).toBe(3);
      expect(secondPage.length).toBe(3);
      expect(firstPage[0].id).not.toBe(secondPage[0].id);
    });

    test('should handle pagination correctly', async () => {
      const page1 = await courseRepo.find({
        limit: 4,
        offset: 0,
        orderBy: { id: 'ASC' },
      });

      const page2 = await courseRepo.find({
        limit: 4,
        offset: 4,
        orderBy: { id: 'ASC' },
      });

      const page3 = await courseRepo.find({
        limit: 4,
        offset: 8,
        orderBy: { id: 'ASC' },
      });

      expect(page1.length).toBe(4);
      expect(page2.length).toBe(4);
      expect(page3.length).toBe(2);
      expect(page1[0].id).toBeLessThan(page2[0].id);
      expect(page2[0].id).toBeLessThan(page3[0].id);
    });
  });

  describe('DELETE operations', () => {
    test('should delete course by id', async () => {
      const course = await courseRepo.create({
        name: 'Course to Delete',
        description: 'Description',
      });

      await courseRepo.deleteById(course.id);

      const found = await courseRepo.findById(course.id);

      expect(found).toBeUndefined();
    });

    test('should delete multiple courses with where condition', async () => {
      await courseRepo.create({
        name: 'Active Course 1',
        description: 'Desc',
        isActive: true,
      });

      await courseRepo.create({
        name: 'Inactive Course 1',
        description: 'Desc',
        isActive: false,
      });

      await courseRepo.create({
        name: 'Inactive Course 2',
        description: 'Desc',
        isActive: false,
      });

      await courseRepo.delete({ isActive: false });

      const remaining = await courseRepo.findAll();

      expect(remaining.length).toBe(1);
      expect(remaining[0].isActive).toBe(true);
    });

    test('should delete lessons by courseId', async () => {
      const course = await courseRepo.create({
        name: 'Course',
        description: 'Description',
      });

      await lessonRepo.create({
        courseId: course.id,
        title: 'Lesson 1',
        content: 'Content 1',
      });

      await lessonRepo.create({
        courseId: course.id,
        title: 'Lesson 2',
        content: 'Content 2',
      });

      await lessonRepo.delete({ courseId: course.id });

      const count = await lessonRepo.count({ courseId: course.id });

      expect(count).toBe(0);
    });

    test('should verify deletion (count should be 0)', async () => {
      const course = await courseRepo.create({
        name: 'Temporary Course',
        description: 'Description',
      });

      const countBefore = await courseRepo.count({ id: course.id });

      expect(countBefore).toBe(1);

      await courseRepo.deleteById(course.id);

      const countAfter = await courseRepo.count({ id: course.id });

      expect(countAfter).toBe(0);
    });

    test('should not affect other records when deleting by id', async () => {
      const course1 = await courseRepo.create({
        name: 'Course 1',
        description: 'Desc 1',
      });

      const course2 = await courseRepo.create({
        name: 'Course 2',
        description: 'Desc 2',
      });

      await courseRepo.deleteById(course1.id);

      const found1 = await courseRepo.findById(course1.id);
      const found2 = await courseRepo.findById(course2.id);

      expect(found1).toBeUndefined();
      expect(found2).toBeDefined();
      expect(found2!.id).toBe(course2.id);
    });
  });
});
