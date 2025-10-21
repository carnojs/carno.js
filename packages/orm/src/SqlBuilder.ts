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

  constructor(model: new () => T) {
    const orm = Orm.getInstance();
    this.driver = orm.driverInstance;
    this.logger = orm.logger;
    this.entityStorage = EntityStorage.getInstance();

    this.getEntity(model);
    this.statements.hooks = this.entity.hooks;
    this.conditionBuilder = new SqlConditionBuilder(
      this.entityStorage,
      this.applyJoin.bind(this),
      this.statements,
    );
    this.modelTransformer = new ModelTransformer(this.entityStorage);
    this.columnManager = new SqlColumnManager(
      this.entityStorage,
      this.statements,
      this.entity,
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
      this.addJoinForRelationshipPath(this.entity, relationshipPath);
    });
    if (this.statements.join) {
      this.statements.join = this.statements.join?.reverse()
    }

    if (this.statements.selectJoin) {
      this.statements.selectJoin = this.statements.selectJoin?.reverse()
    }

    return this;
  }

  private addJoinForRelationshipPath(entity: Options, relationshipPath: string) {
    const relationshipNames = relationshipPath.split('.');
    let currentEntity = entity;
    let currentAlias = this.statements.alias!;
    let statement = this.statements.strategy === 'joined' ? this.statements.join : this.statements.selectJoin;
    let nameAliasProperty = this.statements.strategy === 'joined' ? 'joinAlias' : 'alias';

    relationshipNames.forEach((relationshipName, index) => {
      const relationship = currentEntity.relations.find(rel => rel.propertyKey === relationshipName);

      if (!relationship) {
        // @ts-ignore
        throw new Error(`Relationship "${relationshipName}" not found in entity "${currentEntity.name}"`);
      }

      const isLastRelationship = index === relationshipNames.length - 1;

      if (index === (relationshipNames.length - 2 >= 0 ? relationshipNames.length - 2 : 0)) {
        const join = statement?.find(j => j.joinProperty === relationshipName);
        if (join) {
          // @ts-ignore
          currentAlias = join[nameAliasProperty];
        }
      }

      if (relationship.relation === 'many-to-one' && isLastRelationship) {
        this.applyJoin(relationship, {}, currentAlias);
        statement = this.statements.strategy === 'joined' ? this.statements.join : this.statements.selectJoin;
        currentAlias = statement[statement.length - 1][nameAliasProperty];
      }

      currentEntity = this.entityStorage.get(relationship.entity() as Function)!;
    });
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
    await this.handleSelectJoin(entities, model);

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
    await this.handleSelectJoin(entities, model);
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
      await this.handleSelectJoin(row, models);
      results.push(models);
    }

    return results as any;
  }

  private async handleSelectJoin(entities: any, models): Promise<void> {
    if (!this.statements.selectJoin || this.statements.selectJoin.length === 0) {
      return;
    }

    for (const join of this.statements.selectJoin.reverse()) {
      let ids = entities[`${join.originAlias}_${join.primaryKey}`];
      if (typeof ids === 'undefined') {
        // get of models
        const selectJoined = this.statements.selectJoin.find(j => j.joinEntity === join.originEntity);

        if (!selectJoined) {
          continue;
        }
        ids = this.findIdRecursively(models, selectJoined, join);
      }

      if (Array.isArray(ids)) {
        ids = ids.map((id: any) => this.t(id)).join(', ')
      }

      if (join.where) {
        join.where = `${join.where} AND ${join.alias}."${join.fkKey}" IN (${ids})`;
      } else {
        join.where = `${join.alias}."${join.fkKey}" IN (${ids})`;
      }

      if (join.columns && join.columns.length > 0) {
        join.columns = (join.columns.map(
          (column: string) => `${join.alias}."${column}" as "${join.alias}_${column}"`,
        ) as any[]);
      } else {
        join.columns = this.columnManager.getColumnsForEntity(join.joinEntity, join.alias) as any;
      }

      const child = await this.driver.executeStatement(join);
      this.logger.debug(`SQL: ${child.sql} [${Date.now() - child.startTime}ms]`);

      const property = this.entityStorage.get(this.model)!.relations.find(
        (rel) => rel.propertyKey === join.joinProperty,
      );
      const values = child.query.rows.map((row: any) =>
        this.modelTransformer.transform(join.joinEntity, join, row),
      );

      const path = this.getPathForSelectJoin(join);
      this.setValueByPath(models, path, property?.type === Array ? [...values] : values[0]);
    }

    return models as any;
  }

  getPathForSelectJoin(selectJoin: Statement<any>): string[] | null {
    const path = this.getPathForSelectJoinRecursive(this.statements, selectJoin);
    return path.reverse();
  }

  private setValueByPath(obj: any, path: string[], value: any) {
    let currentObj = obj;

    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      currentObj[key] = currentObj[key] || {};
      currentObj = currentObj[key];
    }

    currentObj[path[path.length - 1]] = value;
  }

  private getPathForSelectJoinRecursive(statements: Statement<any>, selectJoin: Statement<any>): string[] | null {
    const originJoin = this.statements.selectJoin.find(j => j.joinEntity === selectJoin.originEntity);
    let pathInJoin = [];

    if (!originJoin) {
      return [selectJoin.joinProperty]
    }

    if (originJoin.originEntity !== statements.originEntity) {
      pathInJoin = this.getPathForSelectJoinRecursive(statements, originJoin);
    }

    return [selectJoin.joinProperty, ...pathInJoin];
  }

  private findIdRecursively(models: any, selectJoined: any, join: any): any {
    let ids = models[selectJoined.originProperty][join.primaryKey];

    if (typeof ids === 'undefined') {
      const nextSelectJoined = this.statements.selectJoin.find(j => j.joinEntity === selectJoined.originEntity);

      if (nextSelectJoined) {
        // Chamada recursiva para a próxima camada
        ids = this.findIdRecursively(models, nextSelectJoined, join);
      }
    }

    return ids;
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
    let result: string[] = [];

    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        let fullKey = parentKey ? `${parentKey}.${key}` : key;
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          result = result.concat(this.objectToStringMap(obj[key], fullKey));
        } else {
          result.push(`${this.columnManager.discoverAlias(fullKey, true)} ${obj[key]}`);
        }
      }
    }

    return result;
  }

  private getTableName() {
    const tableName = this.entity.tableName || (this.model as Function).name.toLowerCase();
    const schema = this.entity.schema || 'public';
    return {tableName, schema};
  }

  private t(value: any) {
    return (typeof value === 'string') ? `'${value}'` : value;
  }

  private applyJoin(relationShip: Relationship<any>, value: FilterQuery<any>, alias: string) {
    const {tableName, schema} = this.getTableName();
    const {
      tableName: joinTableName,
      schema: joinSchema,
      hooks: joinHooks,
    } = this.entityStorage.get((relationShip.entity() as Function)) || {
      tableName: (relationShip.entity() as Function).name.toLowerCase(),
      schema: 'public',
    };
    let originPrimaryKey = 'id';
    for (const prop in this.entity.properties) {
      if (this.entity.properties[prop].options.isPrimary) {
        originPrimaryKey = prop;
        break;
      }
    }
    const joinAlias = `${this.getAlias(joinTableName)}`;
    const joinWhere = this.conditionBuilder.build(value, joinAlias, relationShip.entity() as Function);
    let on = '';

    switch (relationShip.relation) {
      case "one-to-many":
        on = `${joinAlias}."${this.getFkKey(relationShip)}" = ${alias}."${originPrimaryKey}"`;
        break;
      case "many-to-one":
        on = `${alias}."${relationShip.columnName as string}" = ${joinAlias}."${this.getFkKey(relationShip)}"`;
        break;
    }

    if (this.statements.strategy === 'joined') {
      this.statements.join = this.statements.join || [];
      this.statements.join.push({
        joinAlias: joinAlias,
        joinTable: joinTableName,
        joinSchema: joinSchema || 'public',
        joinWhere: joinWhere,
        joinProperty: relationShip.propertyKey as string,
        originAlias: alias,
        originSchema: schema,
        originTable: tableName,
        propertyKey: relationShip.propertyKey,
        joinEntity: (relationShip.entity() as Function),
        type: 'LEFT',
        // @ts-ignore
        on,
        originalEntity: relationShip.originalEntity as Function,
        hooks: joinHooks,
      })
    } else {

      this.statements.selectJoin = this.statements.selectJoin || [];

      this.statements.selectJoin.push({
        statement: 'select',
        columns: this.originalColumns.filter(column => column.startsWith(`${relationShip.propertyKey as string}`)).map(column => column.split('.')[1]) || [],
        table: `"${joinSchema || 'public'}"."${joinTableName}"`,
        alias: joinAlias,
        where: joinWhere,
        joinProperty: relationShip.propertyKey as string,
        fkKey: this.getFkKey(relationShip),
        primaryKey: originPrimaryKey,
        originAlias: alias,
        originProperty: relationShip.propertyKey as string,
        joinEntity: (relationShip.entity() as Function),
        originEntity: relationShip.originalEntity as Function,
        hooks: joinHooks,
      })
    }
    return joinWhere;
  }

  private getFkKey(relationShip: Relationship<any>): string {
    // se for nullable, deverá retornar o primary key da entidade target
    if (typeof relationShip.fkKey === 'undefined') {
      return 'id'; // TODO: Pegar dinamicamente o primary key da entidade target
    }

    // se o fkKey é uma função, ele retornará a propriedade da entidade que é a chave estrangeira
    // precisamos pegar o nome dessa propriedade
    if (typeof relationShip.fkKey === 'string') {
      return relationShip.fkKey;
    }

    const match = /\.(?<propriedade>[\w]+)/.exec(relationShip.fkKey.toString());
    const propertyKey = match ? match.groups!.propriedade : '';
    const entity = this.entityStorage.get(relationShip.entity() as Function)!;
    const property = Object.entries(entity.properties).find(([key, _value]) => key === propertyKey)?.[1];
    return property.options.columnName;
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
    const alias = tableName.split('').shift() || '';

    let counter = 1;
    let uniqueAlias = `${alias}${counter}`;

    while (this.aliases.has(uniqueAlias)) {
      counter++;
      uniqueAlias = `${alias}${counter}`;
    }

    this.aliases.add(uniqueAlias);
    return uniqueAlias;
  }

  private withDefaultValues(values: any, entityOptions: Options) {
    const property = Object.entries(entityOptions.properties).filter(([_, value]) => value.options.onInsert);
    const defaultProperties = Object.entries(entityOptions.properties).filter(([_, value]) => value.options.default);

    for (const [key, property] of defaultProperties) {
      if (typeof values[key] === 'undefined') {
        if (typeof property.options.default === 'function') {
          values[key] = property.options.default();
        } else {
          values[key] = property.options.default;
        }
      }
    }

    property.forEach(([key, property]) => {
      values[key] = property.options.onInsert!();
      this.updatedColumns.push(`${this.statements.alias}."${key}" as "${this.statements.alias}_${key}"`)
    });

    return values;
  }

  private withUpdatedValues(values: any, entityOptions: Options) {
    const property = Object.entries(entityOptions.properties).filter(([_, value]) => value.options.onUpdate);

    property.forEach(([key, property]) => {
      values[property.options.columnName] = property.options.onUpdate!();
      this.updatedColumns.push(`${this.statements.alias}."${property.options.columnName}" as "${this.statements.alias}_${property.options.columnName}"`)
    });

    return values;
  }

  public callHook(type: string, model?: any) {
    const hooks = this.statements.hooks?.filter(hook => hook.type === type) || [];
    const instance = model || this.statements.instance;

    for (const hook of hooks) {
      instance[hook.propertyName]()

      if (!model) {
        this.reflectToValues();
      }
    }
  }

  private reflectToValues() {
    for (const key in this.statements.instance as any) {
      if (key.startsWith('$')) {
        continue;
      }
      if (key.startsWith('_')) {
        continue;
      }
      if (this.entity.properties[key]) {
        this.statements.values[this.entity.properties[key].options.columnName] = this.statements.instance[key];
        continue;
      }
      const rel = this.entity.relations.find(rel => rel.propertyKey === key)
      if (rel) {
        this.statements.values[rel.columnName] = this.statements.instance[key];
      }
    }
  }
}
