import { BaseEntity } from '../domain/base-entity';
import { SqlBuilder } from '../SqlBuilder';
import {
  FilterQuery,
  FindOptions,
  FindOneOption,
  ValueOrInstance,
} from '../driver/driver.interface';

/**
 * Generic Repository class for database operations.
 * Provides type-safe methods for CRUD operations.
 *
 * @example
 * ```typescript
 * @Service()
 * export class LessonRepository extends Repository<Lesson> {
 *   constructor() {
 *     super(Lesson);
 *   }
 *
 *   async findByCourse(courseId: number): Promise<Lesson[]> {
 *     return this.find({
 *       where: { courseId },
 *       order: { orderIndex: 'ASC' }
 *     });
 *   }
 * }
 * ```
 */
export abstract class Repository<T extends BaseEntity> {
  protected readonly entityClass: { new (): T } & typeof BaseEntity;

  constructor(entityClass: { new (): T } & typeof BaseEntity) {
    this.entityClass = entityClass;
  }

  /**
   * Creates a new query builder for the entity.
   */
  protected createQueryBuilder(): SqlBuilder<T> {
    return this.entityClass.createQueryBuilder<T>();
  }

  /**
   * Finds entities matching the given criteria.
   *
   * @example
   * ```TypeScript
   * const lessons = await repository.find({
   *   where: { courseId: 1, isPublished: true },
   *   order: { orderIndex: 'ASC' },
   *   limit: 10
   * });
   * ```
   */
  async find(options: RepositoryFindOptions<T>): Promise<T[]> {
    const { where, orderBy, limit, offset, fields, load, loadStrategy } = options;

    return this.entityClass.find<T>(
      where || {},
      {
        orderBy: orderBy,
        limit,
        offset,
        fields: fields,
        load: load,
        loadStrategy,
      }
    );
  }

  /**
   * Finds a single entity matching the given criteria.
   * Returns undefined if not found.
   */
  async findOne(options: RepositoryFindOneOptions<T>): Promise<T | undefined> {
    const { where, orderBy, fields, load, loadStrategy } = options;

    return this.entityClass.findOne<T>(
      where || {},
      {
        orderBy: orderBy,
        fields: fields,
        load: load,
        loadStrategy,
      }
    );
  }

  /**
   * Finds a single entity matching the given criteria.
   * Throws an error if not found.
   */
  async findOneOrFail(
    options: RepositoryFindOneOptions<T>
  ): Promise<T> {
    const { where, orderBy, fields, load, loadStrategy } = options;

    return this.entityClass.findOneOrFail<T>(
      where || {},
      {
        orderBy: orderBy,
        fields: fields,
        load: load,
        loadStrategy,
      }
    );
  }

  /**
   * Finds all entities with optional filtering.
   */
  async findAll(
    options?: Omit<RepositoryFindOptions<T>, 'where'>
  ): Promise<T[]> {
    const { orderBy, limit, offset, fields, load, loadStrategy } = options || {};

    return this.entityClass.findAll<T>({
      orderBy: orderBy,
      limit,
      offset,
      fields: fields,
      load: load,
      loadStrategy,
    });
  }

  /**
   * Finds an entity by its primary key.
   */
  async findById(id: number | string): Promise<T | undefined> {
    return this.findOne({ where: { id } as any });
  }

  /**
   * Finds an entity by its primary key.
   * Throws an error if not found.
   */
  async findByIdOrFail(id: number | string): Promise<T> {
    return this.findOneOrFail({ where: { id } as any });
  }

  /**
   * Creates a new entity.
   */
  async create(
    data: Partial<{ [K in keyof T]: ValueOrInstance<T[K]> }>
  ): Promise<T> {
    return this.entityClass.create<T>(data);
  }

  /**
   * Updates entities matching the criteria.
   */
  async update(
    where: FilterQuery<T>,
    data: Partial<{ [K in keyof T]: ValueOrInstance<T[K]> }>
  ): Promise<void> {
    await this.createQueryBuilder()
      .update(data)
      .where(where)
      .execute();
  }

  /**
   * Updates an entity by its primary key.
   */
  async updateById(
    id: number | string,
    data: Partial<{ [K in keyof T]: ValueOrInstance<T[K]> }>
  ): Promise<void> {
    await this.update({ id } as any, data);
  }

  /**
   * Deletes entities matching the criteria.
   *
   * @example
   * ```typescript
   * await repository.delete({ isActive: false });
   * ```
   */
  async delete(where: FilterQuery<T>): Promise<void> {
    await this.createQueryBuilder()
      .delete()
      .where(where)
      .execute();
  }

  /**
   * Deletes an entity by its primary key.
   */
  async deleteById(id: number | string): Promise<void> {
    await this.delete({ id } as any);
  }

  /**
   * Counts entities matching the criteria.
   */
  async count(where?: FilterQuery<T>): Promise<number> {
    return this.createQueryBuilder()
      .count()
      .where(where || {})
      .executeCount();
  }

  /**
   * Checks if any entity matches the criteria.
   */
  async exists(where: FilterQuery<T>): Promise<boolean> {
    const count = await this.count(where);
    return count > 0;
  }
}

/**
 * Find options for repository queries.
 */
export type RepositoryFindOptions<T> = FindOptions<T> & {
  where?: FilterQuery<T>;
  }

/**
 * Find one options for repository queries.
 */
export type RepositoryFindOneOptions<T> = Omit<
  RepositoryFindOptions<T>,
  'limit' | 'offset'
>;
