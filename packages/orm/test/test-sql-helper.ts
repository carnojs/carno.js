import { getDriverType } from '../src/driver/driver-factory';

export function getSerial(columnName: string = 'id'): string {
  const driverType = getDriverType();

  if (driverType === 'mysql') {
    return `\`${columnName}\` INT AUTO_INCREMENT PRIMARY KEY`;
  }

  return `"${columnName}" SERIAL PRIMARY KEY`;
}

export function quote(identifier: string): string {
  const driverType = getDriverType();

  return driverType === 'mysql' ? `\`${identifier}\`` : `"${identifier}"`;
}

export function createTable(tableName: string, columns: string[]): string {
  const q = getDriverType() === 'mysql' ? '`' : '"';
  const columnDefs = columns.join(',\n      ');

  return `CREATE TABLE ${q}${tableName}${q} (
      ${columnDefs}
    );`;
}

export function now(): string {
  const driverType = getDriverType();

  return driverType === 'mysql' ? 'CURRENT_TIMESTAMP' : 'NOW()';
}

export function boolean(defaultValue?: boolean): string {
  const driverType = getDriverType();

  if (driverType === 'mysql') {
    if (defaultValue === undefined) {
      return 'TINYINT(1)';
    }

    return `TINYINT(1) DEFAULT ${defaultValue ? 1 : 0}`;
  }

  if (defaultValue === undefined) {
    return 'boolean';
  }

  return `boolean DEFAULT ${defaultValue}`;
}

export function adaptSqlForCurrentDriver(sql: string): string {
  const driverType = getDriverType();

  if (driverType === 'postgres') {
    return sql;
  }

  let adapted = sql;

  adapted = adapted.replace(/SERIAL\s+PRIMARY\s+KEY/gi, 'INT AUTO_INCREMENT PRIMARY KEY');
  adapted = adapted.replace(/SERIAL/gi, 'INT AUTO_INCREMENT');
  adapted = adapted.replace(/NOW\(\)/gi, 'CURRENT_TIMESTAMP');
  adapted = adapted.replace(/boolean/gi, 'TINYINT(1)');
  adapted = adapted.replace(/TRUE/gi, '1');
  adapted = adapted.replace(/FALSE/gi, '0');
  adapted = adapted.replace(/"([^"]+)"/g, '`$1`');

  return adapted;
}
