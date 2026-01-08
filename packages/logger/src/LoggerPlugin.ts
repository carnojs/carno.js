import { LoggerService, LoggerConfig, LogLevel } from './LoggerService';

/**
 * Logger plugin configuration.
 */
export interface LoggerPluginConfig extends LoggerConfig {
    /** Auto-register as singleton in DI */
    autoRegister?: boolean;
}

/**
 * Create a logger plugin for Turbo.
 * 
 * @example
 * ```typescript
 * const app = new Turbo();
 * app.use(createLoggerPlugin({ level: LogLevel.DEBUG }));
 * 
 * // Now LoggerService is available for injection
 * @Controller()
 * class MyController {
 *   constructor(private logger: LoggerService) {}
 *   
 *   @Get('/')
 *   index() {
 *     this.logger.info('Request received', { path: '/' });
 *     return 'Hello';
 *   }
 * }
 * ```
 */
export function createLoggerPlugin(config: LoggerPluginConfig = {}) {
    const logger = new LoggerService(config);

    return {
        exports: [
            {
                token: LoggerService,
                useValue: logger
            }
        ]
    };
}

/**
 * Create a standalone logger (without Turbo).
 */
export function createLogger(config: LoggerConfig = {}): LoggerService {
    return new LoggerService(config);
}

// Re-export everything
export { LoggerService, LoggerConfig, LogLevel } from './LoggerService';
export type { LogData } from './LoggerService';
