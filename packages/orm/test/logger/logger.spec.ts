import { describe, expect, test, beforeEach, mock } from 'bun:test';
import {
  createLogger,
  resetLogger,
  setDebugEnabled,
  ConsoleLogger,
  SilentLogger,
} from '../../src/logger';

describe('ORM Logger', () => {
  beforeEach(() => {
    resetLogger();
  });

  describe('Debug disabled (default)', () => {
    test('should return SilentLogger when debug is disabled', () => {
      // Given
      setDebugEnabled(false);

      // When
      const logger = createLogger();

      // Then
      expect(logger).toBeInstanceOf(SilentLogger);
    });

    test('should not log anything when debug is disabled', () => {
      // Given
      setDebugEnabled(false);
      const logger = createLogger();
      const consoleSpy = mock(() => {});
      const originalDebug = console.debug;
      console.debug = consoleSpy;

      // When
      logger.debug('test message');

      // Then
      expect(consoleSpy).not.toHaveBeenCalled();

      // Cleanup
      console.debug = originalDebug;
    });
  });

  describe('Debug enabled', () => {
    test('should return ConsoleLogger when debug is enabled and @carno.js/logger not available', () => {
      // Given
      setDebugEnabled(true);

      // When
      const logger = createLogger();

      // Then - Should be ConsoleLogger or LoggerService from @carno.js/logger
      expect(logger).toBeDefined();
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    test('should try to use @carno.js/logger when debug is enabled', () => {
      // Given
      setDebugEnabled(true);

      // When
      const logger = createLogger();

      // Then - If @carno.js/logger is installed, it should use it
      // Otherwise falls back to ConsoleLogger
      const isCarnoLogger = logger.constructor.name === 'LoggerService';
      const isConsoleLogger = logger instanceof ConsoleLogger;

      expect(isCarnoLogger || isConsoleLogger).toBe(true);
    });
  });

  describe('Logger caching', () => {
    test('should return same logger instance on multiple calls', () => {
      // Given
      setDebugEnabled(true);

      // When
      const logger1 = createLogger();
      const logger2 = createLogger();

      // Then
      expect(logger1).toBe(logger2);
    });

    test('should create new logger after reset', () => {
      // Given
      setDebugEnabled(true);
      const logger1 = createLogger();

      // When
      resetLogger();
      setDebugEnabled(false);
      const logger2 = createLogger();

      // Then
      expect(logger1).not.toBe(logger2);
      expect(logger2).toBeInstanceOf(SilentLogger);
    });
  });
});
