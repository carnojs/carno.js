import {
  AutoPath,
  DriverInterface,
  FilterQuery,
  JoinStatement,
  QueryOrderMap,
  Relationship,
  Statement,
  ValueOrInstance,
} from './driver/driver.interface';
import { EntityStorage, Options } from './domain/entities';
import { Orm } from './orm';
import { LoggerService } from '@cheetah.js/core';
import { ValueObject } from './common/value-object';
import { BaseEntity } from './domain/base-entity';
import { extendsFrom } from './utils';
import { ValueProcessor } from './utils/value-processor';
import { SqlConditionBuilder } from './query/sql-condition-builder';
import { ModelTransformer } from './query/model-transformer';
import { SqlColumnManager } from './query/sql-column-manager';
import { SqlJoinManager } from './query/sql-join-manager';

export class SqlBuilder<T> {
  private readonly driver: DriverInterface;
  private entityStorage: EntityStorage;
  private statements: Statement<T> = {};
  private entity!: Options;
  private model!: new () => T;
  private aliases: Set<string> = new Set();
  private logger: LoggerService;
  private updatedColumns: any[] = [];
  private originalColumns: any[] = [];
  private conditionBuilder!: SqlConditionBuilder<T>;
  private modelTransformer!: ModelTransformer;
  private columnManager!: SqlColumnManager;
  private joinManager!: SqlJoinManager<T>;

  constructor(model: new () => T) {
    const orm = Orm.getInstance();
    this.driver = orm.driverInstance;
    this.logger = orm.logger;
    this.entityStorage = EntityStorage.getInstance();

    this.getEntity(model);
    this.statements.hooks = this.entity.hooks;

    this.modelTransformer = new ModelTransformer(this.entityStorage);
    this.columnManager = new SqlColumnManager(
      this.entityStorage,
      this.statements,
      this.entity,
    );

    const applyJoinWrapper = (relationship: Relationship<any>, value: FilterQuery<any>, alias: string) => {
      return this.joinManager.applyJoin(relationship, value, alias);
    };

    this.conditionBuilder = new SqlConditionBuilder(
      this.entityStorage,
      applyJoinWrapper,
      this.statements,
    );

    this.joinManager = new SqlJoinManager(
      this.entityStorage,
      this.statements,
      this.entity,
      this.model,
      this.driver,
      this.logger,
      this.conditionBuilder,
      this.columnManager,
      this.modelTransformer,
      () => this.originalColumns,
      this.getAlias.bind(this),
    );
  }

  select(columns?: AutoPath<T, never, '*'>[]): SqlBuilder<T> {
    const tableName = this.entity.tableName || (this.model as Function).name.toLowerCase();
    const schema = this.entity.schema || 'public';
    this.statements.statement = 'select';
    this.statements.columns = columns
    this.originalColumns = columns || [];
    this.statements.alias = this.getAlias(tableName);
    this.statements.table = `"${schema}"."${tableName}"`;
    return this;
  }

  setStrategy(strategy: 'joined' | 'select' = 'joined'): SqlBuilder<T> {
    this.statements.strategy = strategy;
    return this;
  }

  setInstance(instance: T): SqlBuilder<T> {
    this.statements.instance = instance;
    return this;
  }

  insert(values: Partial<{ [K in keyof T]: ValueOrInstance<T[K]> }>): SqlBuilder<T> {
    const {tableName, schema} = this.getTableName();
    const processedValues = ValueProcessor.processForInsert(values, this.entity);
    this.statements.statement = 'insert';
    this.statements.instance = ValueProcessor.createInstance(processedValues, this.model, 'insert');
    this.statements.alias = this.getAlias(tableName);
    this.statements.table = `"${schema}"."${tableName}"`;
    this.statements.values = this.withUpdatedValues(
      this.withDefaultValues(processedValues, this.entity),
      this.entity,
    );
    this.reflectToValues();
    return this;
  }

  update(values: Partial<{ [K in keyof T]: ValueOrInstance<T[K]> }>): SqlBuilder<T> {
    const {tableName, schema} = this.getTableName();
    const processedValues = ValueProcessor.processForUpdate(values, this.entity);
    this.statements.statement = 'update';
    this.statements.alias = this.getAlias(tableName);
    this.statements.table = `${schema}.${tableName}`;
    this.statements.values = this.withUpdatedValues(processedValues, this.entity);
    this.statements.instance = ValueProcessor.createInstance(processedValues, this.model, 'update');
    return this;
  }

  where(where: FilterQuery<T>): SqlBuilder<T> {
    if (!where || Object.keys(where).length === 0) {
      return this;
    }

    const newWhere = {};
    for (const key in where) {
      if (where[key] instanceof Object){
        newWhere[key] = where[key];
        continue;
      }
      newWhere[ValueProcessor.getColumnName(key, this.entity)] = where[key];
    }
    where = newWhere;
    this.statements.where = this.conditionBuilder.build(where, this.statements.alias!, this.model);
    return this;
  }

  orderBy(orderBy: (QueryOrderMap<T> & { 0?: never }) | QueryOrderMap<T>[]): SqlBuilder<T> {
    if (!orderBy) {
      return this;
    }

    this.statements.orderBy = this.objectToStringMap(orderBy);
    return this;
  }

  limit(limit: number | undefined): SqlBuilder<T> {
    this.statements.limit = limit;
    return this;
  }

  offset(offset: number | undefined): SqlBuilder<T> {
    this.statements.offset = offset;
    return this;
  }

  load(load: string[]): SqlBuilder<T> {
    load?.forEach(relationshipPath => {
      this.joinManager.addJoinForRelationshipPath(relationshipPath);
    });
    if (this.statements.join) {
      this.statements.join = this.statements.join?.reverse()
    }

    if (this.statements.selectJoin) {
      this.statements.selectJoin = this.statements.selectJoin?.reverse()
    }

    return this;
  }

  count(): SqlBuilder<T> {
    const {tableName, schema} = this.getTableName();
    this.statements.statement = 'count';
    this.statements.alias = this.getAlias(tableName);
    this.statements.table = `"${schema}"."${tableName}"`;
    return this;
  }

  private getPrimaryKeyColumnName(entity: Options): string {
    // Lógica para obter o nome da coluna de chave primária da entidade
    // Aqui você pode substituir por sua própria lógica, dependendo da estrutura do seu projeto
    // Por exemplo, se a chave primária for sempre 'id', você pode retornar 'id'.
    // Se a lógica for mais complexa, você pode adicionar um método na classe Options para obter a chave primária.
    return 'id';
  }

  async execute(): Promise<{ query: any; startTime: number; sql: string }> {
    if (!this.statements.columns) {
      this.statements.columns = this.columnManager.generateColumns(this.model, this.updatedColumns);
    } else {
      this.statements.columns = [...this.columnManager.processUserColumns(this.statements.columns), ...this.updatedColumns];
    }
    this.statements.join = this.statements.join?.reverse();
    this.beforeHooks();
    const result = await this.driver.executeStatement(this.statements);
    this.logExecution(result);
    return result;
  }

  private beforeHooks() {
    if (this.statements.statement === 'update') {
      this.callHook('beforeUpdate', this.statements.instance);
      return;
    }

    if (this.statements.statement === 'insert') {
      this.callHook('beforeCreate');
      return;
    }
  }

  private afterHooks(model?: any) {
    if (this.statements.statement === 'update') {
      this.callHook('afterUpdate', this.statements.instance);
      return;
    }

    if (this.statements.statement === 'insert') {
      this.callHook('afterCreate', model);
      return;
    }
  }

  async executeAndReturnFirst(): Promise<T | undefined> {
    this.statements.limit = 1;

    const result = await this.execute();

    if (result.query.rows.length === 0) {
      return undefined;
    }

    const entities = result.query.rows[0];
    const model = await this.modelTransformer.transform(this.model, this.statements, entities);
    this.afterHooks(model);
    await this.joinManager.handleSelectJoin(entities, model);

    return model as any;
  }

  async executeAndReturnFirstOrFail(): Promise<T> {
    this.statements.limit = 1;

    const result = await this.execute();

    if (result.query.rows.length === 0) {
      throw new Error('Result not found');
    }

    const entities = result.query.rows[0];
    const model = await this.modelTransformer.transform(this.model, this.statements, entities);
    this.afterHooks(model);
    await this.joinManager.handleSelectJoin(entities, model);
    return model as any;
  }

  async executeAndReturnAll(): Promise<T[]> {
    const result = await this.execute();

    if (result.query.rows.length === 0) {
      return [];
    }

    const rows = result.query.rows;
    const results = [];

    for (const row of rows) {
      const models = this.modelTransformer.transform(this.model, this.statements, row);
      this.afterHooks(models);
      await this.joinManager.handleSelectJoin(row, models);
      results.push(models);
    }

    return results as any;
  }

  async executeCount(): Promise<number> {
    const result = await this.execute();

    if (result.query.rows.length === 0) {
      return 0;
    }

    return parseInt(result.query.rows[0].count);
  }

  private logExecution(result: { query: any, startTime: number, sql: string }): void {
    this.logger.debug(`SQL: ${result.sql} [${Date.now() - result.startTime}ms]`);
  }

  async inTransaction<T>(callback: (builder: SqlBuilder<T>) => Promise<T>): Promise<T> {
    return await this.driver.transaction(async (tx) => {
      // @ts-ignore
      return await callback(this);
    });
  }

  private objectToStringMap(obj: any, parentKey: string = ''): string[] {
    return Object.keys(obj)
      .filter(key => obj.hasOwnProperty(key))
      .flatMap(key => this.mapObjectKey(obj, key, parentKey));
  }

  private mapObjectKey(obj: any, key: string, parentKey: string): string[] {
    const fullKey = parentKey ? `${parentKey}.${key}` : key;

    if (this.isNestedObject(obj[key])) {
      return this.objectToStringMap(obj[key], fullKey);
    }

    if (parentKey) {
      return [`${this.columnManager.discoverAlias(fullKey, true)} ${obj[key]}`];
    }

    const columnName = ValueProcessor.getColumnName(key, this.entity);
    return [`${this.columnManager.discoverAlias(columnName, true)} ${obj[key]}`];
  }

  private isNestedObject(value: any): boolean {
    return typeof value === 'object' && value !== null;
  }

  private getTableName() {
    const tableName = this.entity.tableName || (this.model as Function).name.toLowerCase();
    const schema = this.entity.schema || 'public';
    return {tableName, schema};
  }

  private t(value: any) {
    return (typeof value === 'string') ? `'${value}'` : value;
  }

  // private conditionLogicalOperatorToSql<T extends typeof BaseEntity>(conditions: Condition<T>[], operator: 'AND' | 'OR'): string {
  //   const sqlParts = conditions.map(cond => this.conditionToSql(cond));
  //   return this.addLogicalOperatorToSql(sqlParts, operator);
  // }

  private getEntity(model: new () => T) {
    const entity = this.entityStorage.get((model as Function));
    this.model = model;

    if (!entity) {
      throw new Error('Entity not found');
    }

    this.entity = entity;
  }

  /**
   * Retrieves an alias for a given table name.
   *
   * @param {string} tableName - The name of the table.
   * @private
   * @returns {string} - The alias for the table name.
   */
  private getAlias(tableName: string): string {
    const baseAlias = tableName.split('').shift() || '';
    const uniqueAlias = this.generateUniqueAlias(baseAlias);
    this.aliases.add(uniqueAlias);
    return uniqueAlias;
  }

  private generateUniqueAlias(baseAlias: string): string {
    let counter = 1;
    let candidate = `${baseAlias}${counter}`;

    while (this.aliases.has(candidate)) {
      counter++;
      candidate = `${baseAlias}${counter}`;
    }

    return candidate;
  }

  private withDefaultValues(values: any, entityOptions: Options) {
    this.applyDefaultProperties(values, entityOptions);
    this.applyOnInsertProperties(values, entityOptions);
    return values;
  }

  private applyDefaultProperties(values: any, entityOptions: Options): void {
    const defaultProperties = Object.entries(entityOptions.properties).filter(([_, value]) => value.options.default);

    for (const [key, property] of defaultProperties) {
      this.setDefaultValue(values, key, property);
    }
  }

  private setDefaultValue(values: any, key: string, property: any): void {
    if (typeof values[key] !== 'undefined') return;

    values[key] = typeof property.options.default === 'function'
      ? property.options.default()
      : property.options.default;
  }

  private applyOnInsertProperties(values: any, entityOptions: Options): void {
    const properties = Object.entries(entityOptions.properties).filter(([_, value]) => value.options.onInsert);
    properties.forEach(([key, property]) => this.applyOnInsert(values, key, property));
  }

  private applyOnInsert(values: any, key: string, property: any): void {
    values[key] = property.options.onInsert!();
    this.updatedColumns.push(`${this.statements.alias}."${key}" as "${this.statements.alias}_${key}"`);
  }

  private withUpdatedValues(values: any, entityOptions: Options) {
    const properties = Object.entries(entityOptions.properties).filter(([_, value]) => value.options.onUpdate);
    properties.forEach(([key, property]) => this.applyOnUpdate(values, property));
    return values;
  }

  private applyOnUpdate(values: any, property: any): void {
    const columnName = property.options.columnName;
    values[columnName] = property.options.onUpdate!();
    this.updatedColumns.push(`${this.statements.alias}."${columnName}" as "${this.statements.alias}_${columnName}"`);
  }

  public callHook(type: string, model?: any) {
    const hooks = this.statements.hooks?.filter(hook => hook.type === type) || [];
    const instance = model || this.statements.instance;
    hooks.forEach(hook => this.executeHook(hook, instance, !model));
  }

  private executeHook(hook: any, instance: any, shouldReflect: boolean): void {
    instance[hook.propertyName]();
    if (shouldReflect) this.reflectToValues();
  }

  private reflectToValues() {
    for (const key in this.statements.instance as any) {
      if (this.shouldSkipKey(key)) continue;
      this.reflectKey(key);
    }
  }

  private shouldSkipKey(key: string): boolean {
    return key.startsWith('$') || key.startsWith('_');
  }

  private reflectKey(key: string): void {
    if (this.entity.properties[key]) {
      this.reflectProperty(key);
      return;
    }

    this.reflectRelation(key);
  }

  private reflectProperty(key: string): void {
    const columnName = this.entity.properties[key].options.columnName;
    this.statements.values[columnName] = this.statements.instance[key];
  }

  private reflectRelation(key: string): void {
    const rel = this.entity.relations.find(rel => rel.propertyKey === key);
    if (rel) {
      this.statements.values[rel.columnName] = this.statements.instance[key];
    }
  }
}
