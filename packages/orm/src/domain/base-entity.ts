import { SqlBuilder } from '../SqlBuilder';
import { FilterQuery, FindOneOption, FindOptions, ValueOrInstance } from '../driver/driver.interface';
import { EntityStorage, Property } from './entities';
import { Metadata } from '@carno.js/core';
import { COMPUTED_PROPERTIES, PROPERTIES_METADATA } from '../constants';

export abstract class BaseEntity {
  private _oldValues: any = {};
  private _changedValues: any = {};
  private $_isPersisted: boolean = false;
  private $_isHydrating: boolean = false;

  constructor() {
    return new Proxy(this, {
      set(target: any, p: string, newValue: any): boolean {
        if (p.startsWith('$') || p.startsWith('_')) {
          target[p] = newValue;
          return true;
        }

        if (target.$_isHydrating) {
          target[p] = newValue;
          return true;
        }

        if (!(p in target._oldValues)) {
          target._oldValues[p] = newValue;
        }

        if (target._oldValues[p] !== newValue) {
          target._changedValues[p] = newValue;
        }

        target[p] = newValue;
        return true;
      },
    })
  }

  $_startHydration(): void {
    this.$_isHydrating = true;
  }

  $_endHydration(): void {
    this.$_isHydrating = false;
  }

  /**
   * Gets current entity's Repository.
   */
  static createQueryBuilder<T>(
    this: { new(): T } & typeof BaseEntity,
  ): SqlBuilder<T> {
    return new SqlBuilder<T>(this);
  }

  /**
   * Gets current entity's Repository.
   */
  private createQueryBuilder<T>(): SqlBuilder<T> {
    // @ts-ignore
    return new SqlBuilder<T>(this.constructor);
  }

  static async find<T, Hint extends string = never>(
    this: { new(): T } & typeof BaseEntity,
    where: FilterQuery<T>,
    options?: FindOptions<T, Hint>
  ): Promise<T[]> {
    return this.createQueryBuilder<T>()
      .select(options?.fields as any)
      .setStrategy(options?.loadStrategy)
      .load(options?.load as any[])
      .where(where)
      .limit(options?.limit)
      .offset(options?.offset)
      .orderBy(options?.orderBy as string[])
      .cache(options?.cache)
      .executeAndReturnAll();
  }

  static async findOne<T, Hint extends string = never>(
    this: { new(): T } & typeof BaseEntity,
    where: FilterQuery<T>,
    options?: FindOneOption<T, Hint>
  ): Promise<T | undefined> {
    return this.createQueryBuilder<T>()
      .select(options?.fields as any)
      .setStrategy(options?.loadStrategy)
      .load(options?.load as any[])
      .where(where)
      .cache(options?.cache)
      .executeAndReturnFirst();
  }

  /**
   * Find a record in the database based on the provided query where and return it, or throw an error if not found.
   *
   * @param {FilterQuery<T>} where - The query where used to search for the record.
   * @param options
   * @return {Promise<T>} - A promise that resolves with the found record.
   */
  static async findOneOrFail<T, Hint extends string = never>(
    this: { new(): T } & typeof BaseEntity,
    where: FilterQuery<T>,
    options?: FindOneOption<T, Hint>
  ): Promise<T> {
    return this.createQueryBuilder<T>()
      // @ts-ignore
      .select(options?.fields)
      .setStrategy(options?.loadStrategy)
      .load(options?.load as any[])
      .where(where)
      .orderBy(options?.orderBy as string[])
      .cache(options?.cache)
      .executeAndReturnFirstOrFail();
  }

  static async findAll<
    T extends object,
    Hint extends string = never
  >(
    this: { new(): T } & typeof BaseEntity,
    options: FindOptions<T, Hint>
  ): Promise<T[]> {
    const builder = this.createQueryBuilder<T>()
      .select(options.fields as any)
      .setStrategy(options?.loadStrategy)
      .load(options?.load as any[])
      .offset(options?.offset)
      .limit(options.limit)
      .orderBy(options?.orderBy as string[])
      .cache(options?.cache);

    return builder.executeAndReturnAll();
  }

  static async create<T extends BaseEntity>(
    this: { new(): T } & typeof BaseEntity,
    where: Partial<{ [K in keyof T]: ValueOrInstance<T[K]> }>,
  ): Promise<T> {
    return this.createQueryBuilder<T>()
      .insert(where)
      .executeAndReturnFirstOrFail();
  }

  public async save() {
    const qb = this.createQueryBuilder()

    if (this.$_isPersisted) {
      qb.update(this._changedValues);
      qb.setInstance(this)
        // @ts-ignore
        qb.where({id: this._oldValues.id})
    } else {
      qb.insert(this._oldValues)
    }

    await qb.execute()
    qb.callHook('afterCreate', this)
    qb.callHook('afterUpdate', this)
    this._oldValues = {
      ...this._oldValues,
      ...this._changedValues,
    }
    this._changedValues = {}
  }

    /**
     * Determines whether the current object has been persisted after the last modification.
     *
     * @return {boolean} Returns true if the object has been persisted, otherwise false.
     */
  public isPersisted() {
    return this.$_isPersisted;
  }

  public toJSON(): Record<string, any> {
    const storage = EntityStorage.getInstance();
    const entity = storage.get(this.constructor);

    const data = entity
      ? this.serializeWithEntity(entity)
      : this.serializeWithMetadata();

    this.addComputedProperties(data);

    return data;
  }

  private serializeWithEntity(entity: any): Record<string, any> {
    const data: Record<string, any> = {};
    const allProperties = new Set<string>(Object.keys(entity.properties));
    const allRelations = new Set<string>((entity.relations || []).map((relation: any) => relation.propertyKey));
    const hidePropertiesSet = new Set<string>(entity.hideProperties);

    for (const key in this) {
      if (this.shouldSkipProperty(key, allProperties, allRelations, hidePropertiesSet)) {
        continue;
      }

      data[key] = this[key];
    }

    return data;
  }

  private serializeWithMetadata(): Record<string, any> {
    const data: Record<string, any> = {};
    const hideProperties = this.getHiddenPropertiesFromMetadata();
    const hidePropertiesSet = new Set<string>(hideProperties);

    for (const key in this) {
      if (this.shouldSkipPropertyBasic(key, hidePropertiesSet)) {
        continue;
      }

      data[key] = this[key];
    }

    return data;
  }

  private shouldSkipProperty(
    key: string,
    allProperties: Set<string>,
    allRelations: Set<string>,
    hideProperties: Set<string>
  ): boolean {
    if (this.isInternalProperty(key)) {
      return true;
    }

    if (!allProperties.has(key) && !allRelations.has(key)) {
      return true;
    }

    return hideProperties.has(key);
  }

  private shouldSkipPropertyBasic(
    key: string,
    hideProperties: Set<string>
  ): boolean {
    if (this.isInternalProperty(key)) {
      return true;
    }

    return hideProperties.has(key);
  }

  private isInternalProperty(key: string): boolean {
    return key.startsWith('$') || key.startsWith('_');
  }

  private getHiddenPropertiesFromMetadata(): string[] {
    const properties: { [key: string]: Property } =
      Metadata.get(PROPERTIES_METADATA, this.constructor) || {};

    const hideProperties: string[] = [];

    for (const [key, prop] of Object.entries(properties)) {
      if (prop.options?.hidden) {
        hideProperties.push(key);
      }
    }

    return hideProperties;
  }

  private addComputedProperties(data: Record<string, any>): void {
    const computedProperties: string[] =
      Metadata.get(COMPUTED_PROPERTIES, this.constructor) || [];

    for (const key of computedProperties) {
      data[key] = this[key as keyof this];
    }
  }
}
