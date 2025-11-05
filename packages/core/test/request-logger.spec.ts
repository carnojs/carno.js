import { describe, expect, it, beforeEach, mock } from 'bun:test'
import { RequestLogger } from '../src/services/request-logger.service'
import { LoggerService } from '../src/services/logger.service'
import { Context } from '../src/domain/Context'


describe('RequestLogger', () => {

  it('should include trackingId in log messages', () => {
    // Given
    const mockLogger = {
      child: mock(() => ({
        info: mock(),
        warn: mock(),
        error: mock(),
        debug: mock(),
        fatal: mock(),
        trace: mock(),
      })),
      info: mock(),
      warn: mock(),
      error: mock(),
      debug: mock(),
      fatal: mock(),
      trace: mock(),
      getLogger: mock(),
    } as unknown as LoggerService

    const context = new (Context as any)()
    context.trackingId = 'test-tracking-id-123'

    // When
    const requestLogger = new RequestLogger(mockLogger, context)

    // Then
    expect(mockLogger.child).toHaveBeenCalledWith({ trackingId: 'test-tracking-id-123' })
  })


  it('should delegate info calls to child logger', () => {
    // Given
    const mockChildLogger = {
      info: mock(),
      warn: mock(),
      error: mock(),
      debug: mock(),
      fatal: mock(),
      trace: mock(),
    }

    const mockLogger = {
      child: mock(() => mockChildLogger),
      info: mock(),
      warn: mock(),
      error: mock(),
      debug: mock(),
      fatal: mock(),
      trace: mock(),
      getLogger: mock(),
    } as unknown as LoggerService

    const context = new (Context as any)()
    context.trackingId = 'test-id'

    const requestLogger = new RequestLogger(mockLogger, context)

    // When
    requestLogger.info('Test message')

    // Then
    expect(mockChildLogger.info).toHaveBeenCalledWith('Test message')
  })


  it('should delegate all log levels to child logger', () => {
    // Given
    const mockChildLogger = {
      info: mock(),
      warn: mock(),
      error: mock(),
      debug: mock(),
      fatal: mock(),
      trace: mock(),
    }

    const mockLogger = {
      child: mock(() => mockChildLogger),
      info: mock(),
      warn: mock(),
      error: mock(),
      debug: mock(),
      fatal: mock(),
      trace: mock(),
      getLogger: mock(),
    } as unknown as LoggerService

    const context = new (Context as any)()
    context.trackingId = 'test-id'

    const requestLogger = new RequestLogger(mockLogger, context)

    // When
    requestLogger.info('Info message')
    requestLogger.warn('Warn message')
    requestLogger.error('Error message')
    requestLogger.debug('Debug message')
    requestLogger.fatal('Fatal message')
    requestLogger.trace('Trace message')

    // Then
    expect(mockChildLogger.info).toHaveBeenCalledWith('Info message')
    expect(mockChildLogger.warn).toHaveBeenCalledWith('Warn message')
    expect(mockChildLogger.error).toHaveBeenCalledWith('Error message')
    expect(mockChildLogger.debug).toHaveBeenCalledWith('Debug message')
    expect(mockChildLogger.fatal).toHaveBeenCalledWith('Fatal message')
    expect(mockChildLogger.trace).toHaveBeenCalledWith('Trace message')
  })
})
