
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
    