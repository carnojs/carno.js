import { BaseEntity } from '../../src/domain/base-entity';
import { Entity } from '../../src/decorators/entity.decorator';
import { ManyToOne } from '../../src/decorators/one-many.decorator';
import { PrimaryKey } from '../../src/decorators/primary-key.decorator';
import { Property } from '../../src/decorators/property.decorator';

@Entity({ tableName: 'test_users' })
export class TestUserEntity extends BaseEntity {
  @PrimaryKey({ dbType: 'int', autoIncrement: true })
  id!: number;

  @Property({ dbType: 'text' })
  name!: string;
}

@Entity({ tableName: 'test_courses' })
export class TestCourseEntity extends BaseEntity {
  @PrimaryKey({ dbType: 'int', autoIncrement: true })
  id!: number;

  @Property({ dbType: 'text' })
  title!: string;
}

@Entity({ tableName: 'test_user_libraries' })
export class TestUserLibraryEntity extends BaseEntity {
  @PrimaryKey({ dbType: 'int', autoIncrement: true })
  id!: number;

  @ManyToOne(() => TestUserEntity)
  user!: TestUserEntity;

  @ManyToOne(() => TestCourseEntity)
  course!: TestCourseEntity;

  @Property({ dbType: 'boolean', columnName: 'is_completed' })
  isCompleted!: boolean;

  @Property({ dbType: 'int', columnName: 'progress' })
  progress!: number;

  @Property({ dbType: 'timestamp', columnName: 'last_accessed_at' })
  lastAccessedAt!: Date;
}
