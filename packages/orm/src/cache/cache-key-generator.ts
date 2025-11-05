import { createHash } from 'crypto';
import { Statement } from '../driver/driver.interface';

export class CacheKeyGenerator {
  generate(statement: Statement<any>): string {
    const parts = this.buildKeyParts(statement);
    const combined = this.combineKeyParts(parts);
    return this.hashKey(combined);
  }

  private buildKeyParts(statement: Statement<any>): string[] {
    const parts: string[] = [];

    this.addTableName(parts, statement);
    this.addColumns(parts, statement);
    this.addWhere(parts, statement);
    this.addOrderBy(parts, statement);
    this.addLimits(parts, statement);
    this.addJoins(parts, statement);

    return parts;
  }

  private addTableName(parts: string[], statement: Statement<any>): void {
    if (statement.table) {
      parts.push(`table:${statement.table}`);
    }
  }

  private addColumns(parts: string[], statement: Statement<any>): void {
    if (statement.columns?.length) {
      parts.push(`cols:${statement.columns.join(',')}`);
    }
  }

  private addWhere(parts: string[], statement: Statement<any>): void {
    if (statement.where) {
      parts.push(`where:${statement.where}`);
    }
  }

  private addOrderBy(parts: string[], statement: Statement<any>): void {
    if (statement.orderBy?.length) {
      parts.push(`order:${statement.orderBy.join(',')}`);
    }
  }

  private addLimits(parts: string[], statement: Statement<any>): void {
    if (statement.limit !== undefined) {
      parts.push(`limit:${statement.limit}`);
    }

    if (statement.offset !== undefined) {
      parts.push(`offset:${statement.offset}`);
    }
  }

  private addJoins(parts: string[], statement: Statement<any>): void {
    if (statement.join?.length) {
      const joinStr = statement.join
        .map((j) => `${j.table}:${j.type}:${j.on}`)
        .join('|');
      parts.push(`join:${joinStr}`);
    }
  }

  private combineKeyParts(parts: string[]): string {
    return parts.join('::');
  }

  private hashKey(key: string): string {
    return createHash('md5')
      .update(key)
      .digest('hex');
  }
}
