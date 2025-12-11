import { SQL } from 'bun';
import {
  ConnectionSettings,
  DriverInterface,
  Statement,
  SnapshotConstraintInfo,
  ColDiff,
} from './driver.interface';
import { transactionContext } from '../transaction/transaction-context';

export abstract class BunDriverBase implements Partial<DriverInterface> {
  protected sql: SQL;
  public connectionString: string;
  public abstract readonly dbType: 'postgres' | 'mysql';

  constructor(options: ConnectionSettings) {
    this.connectionString = this.buildConnectionString(options);
  }

  protected buildConnectionString(options: ConnectionSettings): string {
    if (options.connectionString) {
      return options.connectionString;
    }

    const { host, port, username, password, database } = options;
    const protocol = this.getProtocol();

    return `${protocol}://${username}:${password}@${host}:${port}/${database}`;
  }

  protected abstract getProtocol(): string;
  protected abstract getIdentifierQuote(): string;

  async connect(): Promise<void> {
    if (this.sql) {
      return;
    }

    this.sql = new SQL({
      url: this.connectionString,
      max: 20,
      idleTimeout: 20, // segundos antes de fechar idle
      maxLifetime: 300, // recicla conexões a cada 5 min
      connectionTimeout: 10
    });
    await this.validateConnection();
  }

  protected async validateConnection(): Promise<void> {
    await this.sql.unsafe('SELECT 1');
  }

  async disconnect(): Promise<void> {
    if (!this.sql) {
      return;
    }

    await this.sql.close();
  }

  async executeSql(sqlString: string): Promise<any> {
    const context = this.getExecutionContext();

    return await context.unsafe(sqlString);
  }

  private getExecutionContext(): SQL {
    const txContext = transactionContext.getContext();

    if (txContext) {
      return txContext;
    }

    if (!this.sql) {
      throw new Error('Database not connected');
    }

    return this.sql;
  }

  async transaction<T>(callback: (tx: SQL) => Promise<T>): Promise<T> {
    if (!this.sql) {
      throw new Error('Database not connected');
    }

    return await this.sql.begin(callback);
  }

  protected toDatabaseValue(value: unknown): string | number | boolean {
    if (value === null || value === undefined) {
      return 'NULL';
    }

    if (value instanceof Date) {
      return `'${value.toISOString()}'`;
    }

    switch (typeof value) {
      case 'string':
        return `'${this.escapeString(value)}'`;
      case 'number':
        return value;
      case 'boolean':
        return value;
      case 'object':
        return `'${this.escapeString(JSON.stringify(value))}'`;
      default:
        return `'${this.escapeString(String(value))}'`;
    }
  }

  protected escapeString(value: string): string {
    return value.replace(/'/g, "''");
  }

  protected escapeIdentifier(identifier: string): string {
    return `"${identifier}"`;
  }

  protected buildWhereClause(where: string | undefined): string {
    if (!where) {
      return '';
    }

    return ` WHERE ${where}`;
  }

  protected buildOrderByClause(orderBy: string[] | undefined): string {
    if (!orderBy || orderBy.length === 0) {
      return '';
    }

    return ` ORDER BY ${orderBy.join(', ')}`;
  }

  protected buildLimitClause(limit: number | undefined): string {
    if (!limit) {
      return '';
    }

    return ` LIMIT ${limit}`;
  }

  protected buildOffsetClause(offset: number | undefined): string {
    if (!offset) {
      return '';
    }

    return ` OFFSET ${offset}`;
  }

  protected quote(identifier: string): string {
    const q = this.getIdentifierQuote();
    return `${q}${identifier}${q}`;
  }

  protected buildTableIdentifier(
    schema: string | undefined,
    tableName: string
  ): string {
    return schema
      ? `${this.quote(schema)}.${this.quote(tableName)}`
      : this.quote(tableName);
  }

  protected buildColumnConstraints(colDiff: ColDiff): string {
    const parts: string[] = [];

    if (!colDiff.colChanges?.nullable) {
      parts.push('NOT NULL');
    }

    if (colDiff.colChanges?.primary) {
      parts.push('PRIMARY KEY');
    }

    if (colDiff.colChanges?.unique) {
      parts.push('UNIQUE');
    }

    if (colDiff.colChanges?.default) {
      parts.push(`DEFAULT ${colDiff.colChanges.default}`);
    }

    return parts.length > 0 ? ' ' + parts.join(' ') : '';
  }

  protected abstract buildAutoIncrementType(colDiff: ColDiff): string;
  protected abstract buildEnumType(
    schema: string | undefined,
    tableName: string,
    colDiff: ColDiff
  ): { beforeSql: string; columnType: string };
  protected abstract handleInsertReturn(
    statement: Statement<any>,
    result: any,
    sql: string,
    startTime: number
  ): Promise<{ query: any; startTime: number; sql: string }>;

  async executeStatement(
    statement: Statement<any>
  ): Promise<{ query: any; startTime: number; sql: string }> {
    const startTime = Date.now();
    const context = this.getExecutionContext();

    if (statement.statement === 'insert') {
      const sql = this.buildInsertSqlWithReturn(statement);
      const result = await context.unsafe(sql);
      return this.handleInsertReturn(statement, result, sql, startTime);
    }

    const sql = this.buildStatementSql(statement);
    const result = await context.unsafe(sql);

    return {
      query: { rows: Array.isArray(result) ? result : [] },
      startTime,
      sql,
    };
  }

  protected buildInsertSqlWithReturn(statement: Statement<any>): string {
    const baseSql = this.buildInsertSql(
      statement.table,
      statement.values,
      statement.columns,
      statement.alias
    );
    return this.appendReturningClause(baseSql, statement);
  }

  protected abstract appendReturningClause(
    sql: string,
    statement: Statement<any>
  ): string;

  protected buildStatementSql(statement: Statement<any>): string {
    let sql = this.buildBaseSql(statement);
    sql += this.buildJoinClause(statement);
    sql += this.buildWhereAndOrderClauses(statement);
    return sql;
  }

  protected buildBaseSql(statement: Statement<any>): string {
    const { statement: type, table, columns, values, alias } = statement;

    switch (type) {
      case 'select':
        return `SELECT ${columns ? columns.join(', ') : '*'} FROM ${table} ${alias}`;
      case 'insert':
        return this.buildInsertSql(table, values, columns, alias);
      case 'update':
        return this.buildUpdateSql(table, values, alias);
      case 'delete':
        return this.buildDeleteSql(table, alias);
      case 'count':
        return `SELECT COUNT(*) as count FROM ${table} ${alias}`;
      default:
        return '';
    }
  }

  protected buildInsertSql(
    table: string,
    values: any,
    columns: string[] | undefined,
    alias: string
  ): string {
    const q = this.getIdentifierQuote();
    const fields = Object.keys(values)
      .map((v) => `${q}${v}${q}`)
      .join(', ');
    const vals = Object.values(values)
      .map((value) => this.toDatabaseValue(value))
      .join(', ');

    return `INSERT INTO ${table} (${fields}) VALUES (${vals})`;
  }

  protected buildUpdateSql(
    table: string,
    values: any,
    alias: string
  ): string {
    const sets = Object.entries(values)
      .map(([key, value]) => `${key} = ${this.toDatabaseValue(value)}`)
      .join(', ');

    return `UPDATE ${table} as ${alias} SET ${sets}`;
  }

  protected buildDeleteSql(
    table: string,
    alias: string
  ): string {
    return `DELETE FROM ${table} AS ${alias}`;
  }

  protected buildJoinClause(statement: Statement<any>): string {
    if (!statement.join) return '';

    return statement.join
      .map((join) => {
        const table = `${join.joinSchema}.${join.joinTable}`;
        return ` ${join.type} JOIN ${table} ${join.joinAlias} ON ${join.on}`;
      })
      .join('');
  }

  protected buildWhereAndOrderClauses(statement: Statement<any>): string {
    if (statement.statement === 'insert') return '';

    let sql = this.buildWhereClause(statement.where);
    sql += this.buildOrderByClause(statement.orderBy);
    sql += this.buildLimitAndOffsetClause(statement);
    return sql;
  }

  protected buildLimitAndOffsetClause(statement: Statement<any>): string {
    const { offset, limit } = statement;

    if (offset && limit) {
      return this.buildOffsetClause(offset) + this.buildLimitClause(limit);
    }

    if (limit) {
      return this.buildLimitClause(limit);
    }

    return '';
  }

  protected getForeignKeysFromConstraints(
    constraints: SnapshotConstraintInfo[],
    row: any,
    columnNameField: string
  ): any[] {
    const columnName = row[columnNameField];

    return constraints
      .filter((c) => this.isForeignKeyConstraint(c, columnName))
      .map((c) => this.parseForeignKeyDefinition(c.consDef))
      .filter(Boolean);
  }

  protected isForeignKeyConstraint(
    constraint: SnapshotConstraintInfo,
    columnName: string
  ): boolean {
    return (
      constraint.type === 'FOREIGN KEY' &&
      constraint.consDef.includes(columnName)
    );
  }

  protected parseForeignKeyDefinition(
    consDef: string
  ): {
    referencedColumnName: string;
    referencedTableName: string;
  } | null {
    const quote = this.getIdentifierQuote();
    const escapedQuote = this.escapeRegex(quote);

    const pattern = new RegExp(
      `REFERENCES\\s+(?:${escapedQuote}([^${escapedQuote}]+)${escapedQuote}|([\\w.]+))\\s*\\(([^)]+)\\)`,
      'i'
    );

    const match = consDef.match(pattern);

    if (!match) return null;

    const tableName = (match[1] || match[2]).trim();
    const columnName = match[3].split(',')[0].trim().replace(new RegExp(escapedQuote, 'g'), '');

    return {
      referencedColumnName: columnName,
      referencedTableName: tableName
    };
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}