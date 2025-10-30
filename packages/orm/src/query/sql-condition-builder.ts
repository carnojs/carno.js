import { FilterQuery, Relationship, Statement } from '../driver/driver.interface';
import { EntityStorage, Options } from '../domain/entities';
import { ValueObject } from '../common/value-object';
import { extendsFrom } from '../utils';

type ApplyJoinCallback = (relationship: Relationship<any>, value: FilterQuery<any>, alias: string) => string;

export class SqlConditionBuilder<T> {
  private readonly OPERATORS = ['$eq', '$ne', '$in', '$nin', '$like', '$gt', '$gte', '$lt', '$lte', '$and', '$or'];
  private lastKeyNotOperator = '';

  constructor(
    private entityStorage: EntityStorage,
    private applyJoinCallback: ApplyJoinCallback,
    private statements: Statement<T>,
  ) {}

  build(condition: FilterQuery<T>, alias: string, model: Function): string {
    const sqlParts = this.processConditions(condition, alias, model);

    if (sqlParts.length === 0) {
      return '';
    }

    return this.wrapWithLogicalOperator(sqlParts, 'AND');
  }

  private processConditions(condition: FilterQuery<T>, alias: string, model: Function): string[] {
    const sqlParts: string[] = [];

    for (let [key, value] of Object.entries(condition)) {
      const extractedValue = this.extractValueFromValueObject(value);
      const conditionSql = this.processEntry(key, extractedValue, alias, model);

      if (conditionSql) {
        sqlParts.push(conditionSql);
      }
    }

    return sqlParts;
  }

  private processEntry(key: string, value: any, alias: string, model: Function): string {
    this.trackLastNonOperatorKey(key, model);

    const relationship = this.findRelationship(key, model);
    if (relationship) {
      return this.handleRelationship(relationship, value, alias);
    }

    if (this.isScalarValue(value)) {
      return this.handleScalarValue(key, value, alias, model);
    }

    if (this.isArrayValue(key, value)) {
      return this.buildInCondition(key, value, alias, model);
    }

    return this.handleObjectValue(key, value, alias, model);
  }

  private handleRelationship(relationship: Relationship<any>, value: any, alias: string): string {
    const sql = this.applyJoinCallback(relationship, value, alias);

    if (this.statements.strategy === 'joined') {
      return sql;
    }

    return '';
  }

  private handleScalarValue(key: string, value: any, alias: string, model: Function): string {
    if (key === '$eq') {
      return this.buildSimpleCondition(this.lastKeyNotOperator, value, alias, '=', model);
    }

    return this.buildSimpleCondition(key, value, alias, '=', model);
  }

  private handleObjectValue(key: string, value: any, alias: string, model: Function): string {
    if (this.isLogicalOperator(key)) {
      return this.buildLogicalOperatorCondition(key, value, alias, model);
    }

    return this.buildOperatorConditions(key, value, alias, model);
  }

  private buildLogicalOperatorCondition(key: string, value: any[], alias: string, model: Function): string {
    const conditions = value.map((cond: any) => this.build(cond, alias, model));
    const operator = this.extractLogicalOperator(key);
    return this.wrapWithLogicalOperator(conditions, operator);
  }

  private buildOperatorConditions(key: string, value: any, alias: string, model: Function): string {
    const parts: string[] = [];

    for (const operator of this.OPERATORS) {
      if (operator in value) {
        const condition = this.buildOperatorCondition(key, operator, value[operator], alias, model);
        parts.push(condition);
      }
    }

    return parts.join(' AND ');
  }

  private buildOperatorCondition(key: string, operator: string, value: any, alias: string, model: Function): string {
    switch (operator) {
      case '$eq':
        return this.buildSimpleCondition(key, value, alias, '=', model);
      case '$ne':
        return this.buildSimpleCondition(key, value, alias, '!=', model);
      case '$in':
        return this.buildInCondition(key, value, alias, model);
      case '$nin':
        return this.buildNotInCondition(key, value, alias, model);
      case '$like':
        return this.buildLikeCondition(key, value, alias, model);
      case '$gt':
        return this.buildComparisonCondition(key, value, alias, '>', model);
      case '$gte':
        return this.buildComparisonCondition(key, value, alias, '>=', model);
      case '$lt':
        return this.buildComparisonCondition(key, value, alias, '<', model);
      case '$lte':
        return this.buildComparisonCondition(key, value, alias, '<=', model);
      case '$and':
      case '$or':
        return this.buildNestedLogicalCondition(operator, value, alias, model);
      default:
        return '';
    }
  }

  private buildSimpleCondition(key: string, value: any, alias: string, operator: string, model: Function): string {
    const column = this.resolveColumnName(key, model);
    const formattedValue = this.formatValue(value);
    return `${alias}.${column} ${operator} ${formattedValue}`;
  }

  private buildInCondition(key: string, values: any[], alias: string, model: Function): string {
    const column = this.resolveColumnName(key, model);
    const formattedValues = values.map(val => this.formatValue(val)).join(', ');
    return `${alias}.${column} IN (${formattedValues})`;
  }

  private buildNotInCondition(key: string, values: any[], alias: string, model: Function): string {
    const column = this.resolveColumnName(key, model);
    const formattedValues = values.map(val => this.formatValue(val)).join(', ');
    return `${alias}.${column} NOT IN (${formattedValues})`;
  }

  private buildLikeCondition(key: string, value: string, alias: string, model: Function): string {
    const column = this.resolveColumnName(key, model);
    return `${alias}.${column} LIKE '${value}'`;
  }

  private buildComparisonCondition(key: string, value: any, alias: string, operator: string, model: Function): string {
    const column = this.resolveColumnName(key, model);
    return `${alias}.${column} ${operator} ${value}`;
  }

  private buildNestedLogicalCondition(operator: string, value: any[], alias: string, model: Function): string {
    const conditions = value.map((cond: any) => this.build(cond, alias, model));
    const logicalOp = this.extractLogicalOperator(operator);
    return this.wrapWithLogicalOperator(conditions, logicalOp);
  }

  private wrapWithLogicalOperator(conditions: string[], operator: 'AND' | 'OR'): string {
    return `(${conditions.join(` ${operator} `)})`;
  }

  private extractValueFromValueObject(value: any): any {
    if (extendsFrom(ValueObject, value?.constructor?.prototype)) {
      return (value as ValueObject<any, any>).getValue();
    }
    return value;
  }

  private formatValue(value: any): string {
    return (typeof value === 'string') ? `'${value}'` : value;
  }

  private findRelationship(key: string, model: Function): Relationship<any> | undefined {
    const entity = this.entityStorage.get(model);
    return entity?.relations?.find(rel => rel.propertyKey === key);
  }

  private isScalarValue(value: any): boolean {
    return typeof value !== 'object' || value === null;
  }

  private isArrayValue(key: string, value: any): boolean {
    return !this.OPERATORS.includes(key) && Array.isArray(value);
  }

  private isLogicalOperator(key: string): boolean {
    return ['$or', '$and'].includes(key);
  }

  private extractLogicalOperator(key: string): 'AND' | 'OR' {
    return key.toUpperCase().replace('$', '') as 'AND' | 'OR';
  }

  private trackLastNonOperatorKey(key: string, model: Function): void {
    if (!this.OPERATORS.includes(key)) {
      this.lastKeyNotOperator = key;
    }
  }

  private resolveColumnName(property: string, model: Function): string {
    if (property.startsWith('$')) {
      return property;
    }

    const entity = this.entityStorage.get(model);
    if (!entity) {
      return property;
    }

    const column = entity.properties?.[property]?.options.columnName;
    if (column) {
      return column;
    }

    return this.resolveRelationColumn(property, entity) ?? property;
  }

  private resolveRelationColumn(property: string, entity: Options): string | undefined {
    const relation = entity.relations?.find(rel => rel.propertyKey === property);
    const column = relation?.columnName;
    return typeof column === 'string' ? column : undefined;
  }
}
