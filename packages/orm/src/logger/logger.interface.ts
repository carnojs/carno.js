/**
 * Logger interface for ORM.
 * Abstracts logging to support both @carno.js/logger and console fallback.
 */
export interface Logger {
  debug(message: string, data?: Record<string, any>): void;
  info(message: string, data?: Record<string, any>): void;
  warn(message: string, data?: Record<string, any>): void;
  error(message: string, data?: Record<string, any>): void;
}
