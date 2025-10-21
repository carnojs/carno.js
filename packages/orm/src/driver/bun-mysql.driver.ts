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

  protected getIdentifierQuote(): string {
    return '`';
  }

  protected buildAutoIncrementType(colDiff: ColDiff): string {
    return 'INT AUTO_INCREMENT';
  }

  protected buildEnumType(
    schema: string | undefined,
    tableName: string,
    colDiff: ColDiff
  ): { beforeSql: string; columnType: string } {
    const enumValues = colDiff.colChanges!.enumItems!
      .map((item) => `'${item}'`)
      .join(', ');

    return {
      beforeSql: '',
      columnType: `ENUM(${enumValues})`,
    };
  }

  protected appendReturningClause(
    sql: string,
    statement: Statement<any>
  ): string {
    return sql;
  }

  protected async handleInsertReturn(
    statement: Statement<any>,
    result: any,
    sql: string,
    startTime: number
  ): Promise<{ query: any; startTime: number; sql: string }> {
    if (!statement.columns) {
      return {
        query: { rows: Array.isArray(result) ? result : [] },
        startTime,
        sql,
      };
    }

    const insertId = result.lastInsertRowid;
    const cols = statement.columns.join(', ').replaceAll(`${statement.alias}.`, '');
    const selectSql = `SELECT ${cols} FROM ${statement.table} WHERE id = ${insertId}`;
    const selectResult = await this.sql.unsafe(selectSql);

    return {
      query: { rows: Array.isArray(selectResult) ? selectResult : [] },
      startTime,
      sql,
    };
  }

  protected buildLimitAndOffsetClause(statement: Statement<any>): string {
    const { offset, limit } = statement;

    if (offset && limit) {
      return ` LIMIT ${offset}, ${limit}`;
    }

    if (limit) {
      return this.buildLimitClause(limit);
    }

    return '';
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
          foreignKeys: this.getForeignKeysFromConstraints(
            constraints,
            row,
            'COLUMN_NAME'
          ),
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
