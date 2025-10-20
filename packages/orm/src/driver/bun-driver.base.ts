import { SQL } from 'bun';
import { ConnectionSettings, DriverInterface } from './driver.interface';

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

  async connect(): Promise<void> {
    if (this.sql) {
      return;
    }

    this.sql = new SQL(this.connectionString);
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
    if (!this.sql) {
      throw new Error('Database not connected');
    }

    return await this.sql.unsafe(sqlString);
  }

  async transaction<T>(callback: (tx: SQL) => Promise<T>): Promise<T> {
    if (!this.sql) {
      throw new Error('Database not connected');
    }

    return await this.sql.begin(callback);
  }

  protected toDatabaseValue(value: unknown): string | number | boolean {
    if (value instanceof Date) {
      return `'${value.toISOString()}'`;
    }

    switch (typeof value) {
      case 'string':
        return `'${value}'`;
      case 'number':
        return value;
      case 'boolean':
        return value;
      case 'object':
        return `'${JSON.stringify(value)}'`;
      default:
        return `'${value}'`;
    }
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
}
