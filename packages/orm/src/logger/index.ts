import { createLogger, setLogger, resetLogger, setDebugEnabled } from './logger-factory';
import { ConsoleLogger } from './console-logger';
import { SilentLogger } from './silent-logger';

export {
    createLogger,
    setLogger,
    resetLogger,
    setDebugEnabled,
    ConsoleLogger,
    SilentLogger
};

export type { Logger } from './logger.interface';
