/**
 * SQL String Escape Utility
 *
 * Provides secure string escaping for SQL queries.
 *
 * SECURITY NOTE: While this escaping is robust, parameterized queries
 * (prepared statements) are the gold standard for SQL injection prevention.
 * This utility should be used only when parameterized queries are not feasible.
 */

const QUOTE_REGEX = /'/g;
const BACKSLASH_REGEX = /\\/g;

export function escapeString(value: string): string {
  if (value.indexOf('\x00') !== -1) {
    throw new Error(
      'SQL injection attempt detected: null byte in string value',
    );
  }

  return value.replace(QUOTE_REGEX, "''").replace(BACKSLASH_REGEX, '\\\\');
}

export function escapeLikePattern(value: string): string {
  const escaped = escapeString(value);

  return escaped.replace(/[%_]/g, (char) => '\\' + char);
}
