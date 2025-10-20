import {
  ColDiff,
  ConnectionSettings,
  DriverInterface,
  ForeignKeyInfo,
  SnapshotConstraintInfo,
  SnapshotIndexInfo,
  SnapshotTable,
  Statement,
} from './driver.interface';
import { BunDriverBase } from './bun-driver.base';

export class BunMysqlDriver extends BunDriverBase implements DriverInterface {
  readonly dbType = 'mysql' as const;

  constructor(options: ConnectionSettings) {
    super(options);
  }

  protected getProtocol(): string {
    return 'mysql';
  }

  getCreateTableInstruction(
    schema: string | undefined,
    tableName: string,
    creates: ColDiff[]
  ): string {
    let beforeSql = ``;

    const st = `CREATE TABLE \`${schema}\`.\`${tableName}\` (${creates
      .map((colDiff) => {
        const isAutoIncrement = colDiff.colChanges?.autoIncrement;
        let sql = ``;

        if (colDiff.colChanges?.enumItems) {
          const enumValues = colDiff.colChanges.enumItems
            .map((item) => `'${item}'`)
            .join(', ');
          sql += `\`${colDiff.colName}\` ENUM(${enumValues})`;
        } else {
          const type = isAutoIncrement
            ? 'INT AUTO_INCREMENT'
            : colDiff.colType + (colDiff.colLength ? `(${colDiff.colLength})` : '');
          sql += `\`${colDiff.colName}\` ${type}`;
        }

        if (!colDiff.colChanges?.nullable) {
          sql += ' NOT NULL';
        }

        if (colDiff.colChanges?.primary) {
          sql += ' PRIMARY KEY';
        }

        if (colDiff.colChanges?.unique) {
          sql += ' UNIQUE';
        }

        if (colDiff.colChanges?.default) {
          sql += ` DEFAULT ${colDiff.colChanges.default}`;
        }

        return sql;
      })
      .join(', ')});`;

    return beforeSql + st;
  }

  getAlterTableFkInstruction(
    schema: string | undefined,
    tableName: string,
    colDiff: ColDiff,
    fk: ForeignKeyInfo
  ): string {
    return `ALTER TABLE \`${schema}\`.\`${tableName}\` ADD CONSTRAINT \`${tableName}_${colDiff.colName}_fk\` FOREIGN KEY (\`${colDiff.colName}\`) REFERENCES \`${fk.referencedTableName}\` (\`${fk.referencedColumnName}\`);`;
  }

  getCreateIndex(
    index: { name: string; properties: string[] },
    schema: string | undefined,
    tableName: string
  ): string {
    return `CREATE INDEX \`${index.name}\` ON \`${schema}\`.\`${tableName}\` (${index.properties.map((prop) => `\`${prop}\``).join(', ')});`;
  }

  getAddColumn(
    schema: string | undefined,
    tableName: string,
    colName: string,
    colDiff: ColDiff,
    colDiffInstructions: string[]
  ): void {
    let sql = ``;

    if (colDiff.colChanges?.enumItems) {
      const enumValues = colDiff.colChanges.enumItems
        .map((item) => `'${item}'`)
        .join(', ');
      sql += `ALTER TABLE \`${schema}\`.\`${tableName}\` ADD COLUMN \`${colDiff.colName}\` ENUM(${enumValues})`;
    } else {
      sql += `ALTER TABLE \`${schema}\`.\`${tableName}\` ADD COLUMN \`${colName}\` ${colDiff.colType}${colDiff.colLength ? `(${colDiff.colLength})` : ''}`;
    }

    if (!colDiff.colChanges?.nullable) {
      sql += ' NOT NULL';
    }

    if (colDiff.colChanges?.primary) {
      sql += ' PRIMARY KEY';
    }

    if (colDiff.colChanges?.unique) {
      sql += ' UNIQUE';
    }

    if (colDiff.colChanges?.default) {
      sql += ` DEFAULT ${colDiff.colChanges.default}`;
    }

    colDiffInstructions.push(sql.concat(';'));

    if (colDiff.colChanges?.foreignKeys) {
      colDiff.colChanges.foreignKeys.forEach((fk) => {
        colDiffInstructions.push(
          `ALTER TABLE \`${schema}\`.\`${tableName}\` ADD CONSTRAINT \`${tableName}_${colName}_fk\` FOREIGN KEY (\`${colName}\`) REFERENCES \`${fk.referencedTableName}\` (\`${fk.referencedColumnName}\`);`
        );
      });
    }
  }

  getDropColumn(
    colDiffInstructions: string[],
    schema: string | undefined,
    tableName: string,
    colName: string
  ): void {
    colDiffInstructions.push(
      `ALTER TABLE \`${schema}\`.\`${tableName}\` DROP COLUMN IF EXISTS \`${colName}\`;`
    );
  }

  getDropIndex(
    index: { name: string; properties?: string[] },
    schema: string | undefined,
    tableName: string
  ): string {
    return `ALTER TABLE \`${schema}\`.\`${tableName}\` DROP INDEX \`${index.name}\`;`;
  }

  getAlterTableType(
    schema: string | undefined,
    tableName: string,
    colName: string,
    colDiff: ColDiff
  ): string {
    return `ALTER TABLE \`${schema}\`.\`${tableName}\` MODIFY COLUMN \`${colName}\` ${colDiff.colType}${colDiff.colLength ? `(${colDiff.colLength})` : ''};`;
  }

  getAlterTableDefaultInstruction(
    schema: string | undefined,
    tableName: string,
    colName: string,
    colDiff: ColDiff
  ): string {
    return `ALTER TABLE \`${schema}\`.\`${tableName}\` ALTER COLUMN \`${colName}\` SET DEFAULT ${colDiff.colChanges!.default};`;
  }

  getAlterTablePrimaryKeyInstruction(
    schema: string | undefined,
    tableName: string,
    colName: string,
    colDiff: ColDiff
  ): string {
    return `ALTER TABLE \`${schema}\`.\`${tableName}\` ADD PRIMARY KEY (\`${colName}\`);`;
  }

  getDropConstraint(
    param: { name: string },
    schema: string | undefined,
    tableName: string
  ): string {
    return `ALTER TABLE \`${schema}\`.\`${tableName}\` DROP FOREIGN KEY \`${param.name}\`;`;
  }

  getAddUniqueConstraint(
    schema: string | undefined,
    tableName: string,
    colName: string
  ): string {
    return `ALTER TABLE \`${schema}\`.\`${tableName}\` ADD UNIQUE (\`${colName}\`);`;
  }

  getAlterTableDropNullInstruction(
    schema: string | undefined,
    tableName: string,
    colName: string,
    colDiff: ColDiff
  ): string {
    return `ALTER TABLE \`${schema}\`.\`${tableName}\` MODIFY COLUMN \`${colName}\` ${colDiff.colType} NULL;`;
  }

  getAlterTableDropNotNullInstruction(
    schema: string | undefined,
    tableName: string,
    colName: string,
    colDiff: ColDiff
  ): string {
    return `ALTER TABLE \`${schema}\`.\`${tableName}\` MODIFY COLUMN \`${colName}\` ${colDiff.colType} NOT NULL;`;
  }

  getAlterTableEnumInstruction(
    schema: string,
    tableName: string,
    colName: string,
    colDiff: ColDiff
  ): string {
    const enumValues = colDiff.colChanges!.enumItems!
      .map((item) => `'${item}'`)
      .join(', ');

    return `ALTER TABLE \`${schema}\`.\`${tableName}\` MODIFY COLUMN \`${colName}\` ENUM(${enumValues});`;
  }

  getDropTypeEnumInstruction(
    param: { name: string },
    schema: string | undefined,
    tableName: string
  ): string {
    return '';
  }

  async executeStatement(
    statement: Statement<any>
  ): Promise<{ query: any; startTime: number; sql: string }> {
    let { statement: statementType, table, columns, where, limit, alias } = statement;
    let sql = '';

    switch (statementType) {
      case 'select':
        sql = `SELECT ${columns ? columns.join(', ') : '*'} FROM ${table} ${alias}`;
        break;

      case 'insert':
        const fields = Object.keys(statement.values)
          .map((v) => `\`${v}\``)
          .join(', ');
        const values = Object.values(statement.values)
          .map((value) => this.toDatabaseValue(value))
          .join(', ');

        sql = `INSERT INTO ${table} (${fields}) VALUES (${values})`;
        break;

      case 'update':
        sql = `UPDATE ${table} as ${alias} SET ${Object.entries(statement.values)
          .map(([key, value]) => `${key} = ${this.toDatabaseValue(value)}`)
          .join(', ')}`;
        break;

      case 'delete':
        break;
    }

    if (statement.join) {
      statement.join.forEach((join) => {
        sql += ` ${join.type} JOIN ${join.joinSchema}.${join.joinTable} ${join.joinAlias} ON ${join.on}`;
      });
    }

    if (statementType !== 'insert') {
      sql += this.buildWhereClause(where);
      sql += this.buildOrderByClause(statement.orderBy);

      if (statement.offset && limit) {
        sql += ` LIMIT ${statement.offset}, ${limit}`;
      } else if (limit) {
        sql += this.buildLimitClause(limit);
      }
    }

    const startTime = Date.now();
    const result = await this.sql.unsafe(sql);

    if (statementType === 'insert' && statement.columns) {
      const insertId = result.lastInsertRowid;
      const selectSql = `SELECT ${statement.columns.join(', ').replaceAll(`${alias}.`, '')} FROM ${table} WHERE id = ${insertId}`;
      const insertResult = await this.sql.unsafe(selectSql);

      return {
        query: { rows: Array.isArray(insertResult) ? insertResult : [] },
        startTime,
        sql,
      };
    }

    return {
      query: { rows: Array.isArray(result) ? result : [] },
      startTime,
      sql,
    };
  }

  async snapshot(
    tableName: string,
    options: any
  ): Promise<SnapshotTable | undefined> {
    const schema = (options && options.schema) || 'information_schema';

    const sql = `SELECT * FROM information_schema.columns WHERE table_name = '${tableName}' AND table_schema = DATABASE()`;
    const result = await this.sql.unsafe(sql);

    if (!result || result.length === 0) {
      return;
    }

    const indexes = (await this.index(tableName, options)) || [];
    const constraints = (await this.constraints(tableName, options)) || [];

    return {
      tableName,
      schema,
      indexes,
      columns: result.map((row) => {
        return {
          default: row.COLUMN_DEFAULT,
          length:
            row.CHARACTER_MAXIMUM_LENGTH ||
            row.NUMERIC_PRECISION ||
            row.DATETIME_PRECISION,
          name: row.COLUMN_NAME,
          nullable: row.IS_NULLABLE === 'YES',
          primary: row.COLUMN_KEY === 'PRI',
          unique: row.COLUMN_KEY === 'UNI' || row.COLUMN_KEY === 'PRI',
          type: row.DATA_TYPE,
          foreignKeys: this.getForeignKeys(constraints, row),
          isEnum: row.DATA_TYPE === 'enum',
          enumItems: row.DATA_TYPE === 'enum' ? this.parseEnumValues(row.COLUMN_TYPE) : undefined,
          precision: row.NUMERIC_PRECISION,
          scale: row.NUMERIC_SCALE,
          isDecimal: row.DATA_TYPE === 'decimal',
        };
      }),
    };
  }

  private parseEnumValues(columnType: string): string[] {
    const match = columnType.match(/enum\((.*)\)/);

    if (!match) {
      return [];
    }

    return match[1].split(',').map((v) => v.trim().replace(/'/g, ''));
  }

  private getForeignKeys(constraints: SnapshotConstraintInfo[], row: any) {
    return constraints
      .filter((c) => c.type === 'FOREIGN KEY' && c.consDef.includes(row.COLUMN_NAME))
      .map((c) => {
        const filter = c.consDef.match(/REFERENCES\s+`([^`]+)`\s*\(([^)]+)\)/);

        if (!filter) {
          throw new Error('Invalid constraint definition');
        }

        return {
          referencedColumnName: filter[2].split(',')[0].trim().replace(/`/g, ''),
          referencedTableName: filter[1],
        };
      });
  }

  async index(
    tableName: string,
    options: any
  ): Promise<SnapshotIndexInfo[] | undefined> {
    const result = await this.sql.unsafe(
      `SHOW INDEX FROM \`${tableName}\` FROM \`${options.schema || 'information_schema'}\``
    );

    return result
      .filter((row) => row.Key_name !== 'PRIMARY')
      .map((row) => {
        return {
          table: tableName,
          indexName: row.Key_name,
          columnName: row.Column_name,
        };
      });
  }

  async constraints(
    tableName: string,
    options: any
  ): Promise<SnapshotConstraintInfo[] | undefined> {
    const result = await this.sql.unsafe(
      `SELECT
        CONSTRAINT_NAME as index_name,
        CONCAT('REFERENCES \`', REFERENCED_TABLE_NAME, '\` (\`', REFERENCED_COLUMN_NAME, '\`)') as consdef,
        'FOREIGN KEY' as constraint_type
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_NAME = '${tableName}'
         AND TABLE_SCHEMA = DATABASE()
         AND REFERENCED_TABLE_NAME IS NOT NULL`
    );

    return result.map((row) => {
      return {
        indexName: row.index_name,
        type: row.constraint_type,
        consDef: row.consdef,
      };
    });
  }
}
