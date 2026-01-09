import type { Logger } from './logger.interface';

/**
 * Silent logger that does nothing.
 * Used when debug is disabled.
 */
export class SilentLogger implements Logger {
  debug(): void {}

  info(): void {}

  warn(): void {}

  error(): void {}
}
