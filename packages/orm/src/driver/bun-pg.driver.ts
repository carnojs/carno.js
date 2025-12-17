import {
  ColDiff,
  ConnectionSettings,
  DriverInterface,
  ForeignKeyInfo,
  IndexStatement,
  SnapshotConstraintInfo,
  SnapshotIndexInfo,
  SnapshotTable,
  Statement,
} from './driver.interface';
import { BunDriverBase } from './bun-driver.base';

export class BunPgDriver extends BunDriverBase implements DriverInterface {
  readonly dbType = 'postgres' as const;

  constructor(options: ConnectionSettings) {
    super(options);
  }

  protected getProtocol(): string {
    return 'postgres';
  }

  protected getIdentifierQuote(): string {
    return '"';
  }

  protected buildAutoIncrementType(colDiff: ColDiff): string {
    return 'SERIAL';
  }

  protected buildEnumType(
    schema: string | undefined,
    tableName: string,
    colDiff: ColDiff
  ): { beforeSql: string; columnType: string } {
    const enumName = `${schema}_${tableName}_${colDiff.colName}_enum`;
    const enumValues = colDiff.colChanges!.enumItems!
      .map((item) => `'${item}'`)
      .join(', ');

    const beforeSql = `CREATE TYPE "${enumName}" AS ENUM (${enumValues});`;
    const columnType = `"${enumName}"`;

    return { beforeSql, columnType };
  }

  protected appendReturningClause(
    sql: string,
    statement: Statement<any>
  ): string {
    const cols = statement.columns!.join(', ').replaceAll(`${statement.alias}.`, '');
    return `${sql} RETURNING ${cols}`;
  }

  protected async handleInsertReturn(
    statement: Statement<any>,
    result: any,
    sql: string,
    startTime: number
  ): Promise<{ query: any; startTime: number; sql: string }> {
    return {
      query: { rows: Array.isArray(result) ? result : [] },
      startTime,
      sql,
    };
  }

  getCreateTableInstruction(
    schema: string | undefined,
    tableName: string,
    creates: ColDiff[]
  ): string {
    let beforeSql = ``;

    const st = `CREATE TABLE "${schema}"."${tableName}" (${creates
      .map((colDiff) => {
        const isAutoIncrement = colDiff.colChanges?.autoIncrement;
        let sql = ``;

        if (colDiff.colChanges?.enumItems) {
          beforeSql += `CREATE TYPE "${schema}_${tableName}_${colDiff.colName}_enum" AS ENUM (${colDiff.colChanges.enumItems.map((item) => `'${item}'`).join(', ')});`;
          sql += `"${colDiff.colName}" "${schema}_${tableName}_${colDiff.colName}_enum"`;
        } else {
          sql += `"${colDiff.colName}" ${isAutoIncrement ? 'SERIAL' : colDiff.colType + (colDiff.colLength ? `(${colDiff.colLength})` : '')}`;
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
    return `ALTER TABLE "${schema}"."${tableName}" ADD CONSTRAINT "${tableName}_${colDiff.colName}_fk" FOREIGN KEY ("${colDiff.colName}") REFERENCES "${fk.referencedTableName}" ("${fk.referencedColumnName}");`;
  }

  getCreateIndex(
    index: IndexStatement,
    schema: string | undefined,
    tableName: string
  ): string {
    const properties = index.properties || [];
    if (properties.length === 0) {
      throw new Error("Index properties are required.");
    }

    const columns = properties.map((prop) => `"${prop}"`).join(', ');
    const where = this.buildWhereClause(index.where);

    return `CREATE INDEX "${index.name}" ON "${schema}"."${tableName}" (${columns})${where};`;
  }

  getAddColumn(
    schema: string | undefined,
    tableName: string,
    colName: string,
    colDiff: ColDiff,
    colDiffInstructions: string[]
  ): void {
    let beforeSql = ``;
    let sql = ``;

    if (colDiff.colChanges?.enumItems) {
      beforeSql += `CREATE TYPE "${schema}_${tableName}_${colDiff.colName}_enum" AS ENUM (${colDiff.colChanges.enumItems.map((item) => `'${item}'`).join(', ')});`;
      colDiffInstructions.push(beforeSql);
      sql += `ALTER TABLE "${schema}"."${tableName}" ADD COLUMN "${colDiff.colName}" "${schema}_${tableName}_${colDiff.colName}_enum"`;
    } else {
      sql += `ALTER TABLE "${schema}"."${tableName}" ADD COLUMN "${colName}" ${colDiff.colType}${colDiff.colLength ? `(${colDiff.colLength})` : ''}`;
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
          `ALTER TABLE "${schema}"."${tableName}" ADD CONSTRAINT "${tableName}_${colName}_fk" FOREIGN KEY ("${colName}") REFERENCES "${fk.referencedTableName}" ("${fk.referencedColumnName}");`
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
      `ALTER TABLE "${schema}"."${tableName}" DROP COLUMN IF EXISTS "${colName}";`
    );
  }

  getDropIndex(
    index: { name: string; properties?: string[] },
    schema: string | undefined,
    tableName: string
  ): string {
    return this.getDropConstraint(index, schema, tableName);
  }

  getAlterTableType(
    schema: string | undefined,
    tableName: string,
    colName: string,
    colDiff: ColDiff
  ): string {
    return `ALTER TABLE "${schema}"."${tableName}" ALTER COLUMN "${colName}" TYPE ${colDiff.colType}${colDiff.colLength ? `(${colDiff.colLength})` : ''};`;
  }

  getAlterTableDefaultInstruction(
    schema: string | undefined,
    tableName: string,
    colName: string,
    colDiff: ColDiff
  ): string {
    return `ALTER TABLE "${schema}"."${tableName}" ALTER COLUMN "${colName}" SET DEFAULT ${colDiff.colChanges!.default};`;
  }

  getAlterTablePrimaryKeyInstruction(
    schema: string | undefined,
    tableName: string,
    colName: string,
    colDiff: ColDiff
  ): string {
    return `ALTER TABLE "${schema}"."${tableName}" ADD PRIMARY KEY ("${colName}");`;
  }

  getDropConstraint(
    param: { name: string },
    schema: string | undefined,
    tableName: string
  ): string {
    return `ALTER TABLE "${schema}"."${tableName}" DROP CONSTRAINT "${param.name}";`;
  }

  getAddUniqueConstraint(
    schema: string | undefined,
    tableName: string,
    colName: string
  ): string {
    return `ALTER TABLE "${schema}"."${tableName}" ADD UNIQUE ("${colName}");`;
  }

  getAlterTableDropNullInstruction(
    schema: string | undefined,
    tableName: string,
    colName: string,
    colDiff: ColDiff
  ): string {
    return `ALTER TABLE "${schema}"."${tableName}" ALTER COLUMN "${colName}" DROP NOT NULL;`;
  }

  getAlterTableDropNotNullInstruction(
    schema: string | undefined,
    tableName: string,
    colName: string,
    colDiff: ColDiff
  ): string {
    return `ALTER TABLE "${schema}"."${tableName}" ALTER COLUMN "${colName}" SET NOT NULL;`;
  }

  getAlterTableEnumInstruction(
    schema: string,
    tableName: string,
    colName: string,
    colDiff: ColDiff
  ): string {
    return `ALTER TABLE "${schema}"."${tableName}" ALTER COLUMN "${colName}" TYPE varchar(255);DROP TYPE IF EXISTS "${schema}_${tableName}_${colName}_enum";CREATE TYPE "${schema}_${tableName}_${colName}_enum" AS ENUM (${colDiff.colChanges!.enumItems!.map((item) => `'${item}'`).join(', ')});ALTER TABLE "${schema}"."${tableName}" ALTER COLUMN "${colName}" TYPE "${schema}_${tableName}_${colName}_enum" USING "${colName}"::text::"${schema}_${tableName}_${colName}_enum"`;
  }

  getDropTypeEnumInstruction(
    param: { name: string },
    schema: string | undefined,
    tableName: string
  ): string {
    return `DROP TYPE IF EXISTS "${param.name}";`;
  }

  async snapshot(
    tableName: string,
    options: any
  ): Promise<SnapshotTable | undefined> {
    const schema = (options && options.schema) || 'public';
    const sql = `SELECT * FROM information_schema.columns WHERE table_name = '${tableName}' AND table_schema = '${schema}'`;
    const result = await this.sql.unsafe(sql);

    if (!result || result.length === 0) {
      return;
    }

    const indexes = (await this.index(tableName, options)) || [];
    const constraints = (await this.constraints(tableName, options)) || [];

    let enums = await this.getEnums(tableName, schema);
    enums = enums.reduce((acc, curr) => {
      if (!acc[curr.type]) {
        acc[curr.type] = [];
      }

      acc[curr.type].push(curr.label);

      return acc;
    }, {});

    return {
      tableName,
      schema,
      indexes,
      columns: result.map((row) => {
        return {
          default: row.column_default,
          length:
            row.character_maximum_length ||
            row.numeric_precision ||
            row.datetime_precision,
          name: row.column_name,
          nullable: row.is_nullable === 'YES',
          primary: constraints.some(
            (c) => c.type === 'PRIMARY KEY' && c.consDef.includes(row.column_name)
          ),
          unique: constraints.some(
            (c) =>
              (c.type === 'UNIQUE' || c.type === 'PRIMARY KEY') &&
              c.consDef.includes(row.column_name)
          ),
          type: row.data_type,
          foreignKeys: this.getForeignKeysFromConstraints(
            constraints,
            row,
            'column_name'
          ),
          isEnum: row.data_type === 'USER-DEFINED',
          enumItems:
            row.data_type === 'USER-DEFINED'
              ? enums[`${schema}_${tableName}_${row.column_name}_enum`]
              : undefined,
          precision: row.numeric_precision,
          scale: row.numeric_scale,
          isDecimal: row.data_type === 'numeric',
        };
      }),
    };
  }

  async index(
    tableName: string,
    options: any
  ): Promise<SnapshotIndexInfo[] | undefined> {
    const schema = (options && options.schema) || 'public';

    let result = await this.sql.unsafe(
      `SELECT indexname AS index_name, indexdef AS column_name, tablename AS table_name
       FROM pg_indexes
       WHERE tablename = '${tableName}' AND schemaname = '${schema}'`
    );

    result = result.filter(
      (row) =>
        row.index_name.includes('_pkey') || !row.column_name.includes('UNIQUE INDEX')
    );

    return result.map((row) => {
      return {
        table: tableName,
        indexName: row.index_name,
        columnName: row.column_name,
      };
    });
  }

  async constraints(
    tableName: string,
    options: any
  ): Promise<SnapshotConstraintInfo[] | undefined> {
    const schema = (options && options.schema) || 'public';

    const result = await this.sql.unsafe(
      `SELECT
        conname AS index_name,
        pg_get_constraintdef(pg_constraint.oid) as consdef,
        CASE contype
            WHEN 'c' THEN 'CHECK'
            WHEN 'f' THEN 'FOREIGN KEY'
            WHEN 'p' THEN 'PRIMARY KEY'
            WHEN 'u' THEN 'UNIQUE'
            WHEN 't' THEN 'TRIGGER'
            WHEN 'x' THEN 'EXCLUSION'
            ELSE 'UNKNOWN'
            END AS constraint_type
       FROM pg_constraint
       where conrelid =  (
           SELECT oid
           FROM pg_class
           WHERE relname = '${tableName}'
             AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = '${schema}')
       )
         AND conkey @> ARRAY(
           SELECT attnum
    FROM pg_attribute
    WHERE attrelid = conrelid
      AND attname = '${schema}'
  )`
    );

    return result.map((row) => {
      return {
        indexName: row.index_name,
        type: row.constraint_type,
        consDef: row.consdef,
      };
    });
  }

  private async getEnums(tableName: any, schema: string) {
    const result = await this.sql.unsafe(`SELECT e.enumlabel as label, t.typname as type
       FROM pg_type t
       JOIN pg_enum e ON t.oid = e.enumtypid
       JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
       WHERE n.nspname = '${schema}'`);

    return result.map((row) => {
      return {
        label: row.label,
        type: row.type,
      };
    });
  }
}
