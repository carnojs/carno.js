import type { Logger } from './logger.interface';

/**
 * Console-based logger fallback.
 * Used when @carno.js/logger is not installed.
 */
export class ConsoleLogger implements Logger {
  debug(message: string, data?: Record<string, any>): void {
    console.debug(`[DEBUG] ${message}`, data ?? '');
  }

  info(message: string, data?: Record<string, any>): void {
    console.info(`[INFO] ${message}`, data ?? '');
  }

  warn(message: string, data?: Record<string, any>): void {
    console.warn(`[WARN] ${message}`, data ?? '');
  }

  error(message: string, data?: Record<string, any>): void {
    console.error(`[ERROR] ${message}`, data ?? '');
  }
}
