import type { ResolvedConfig } from './types';

/**
 * Token for injecting static config into controller.
 */
export const STATIC_CONFIG_TOKEN = Symbol('StaticConfig');

/**
 * In-memory file cache for production mode.
 * Maps file path -> pre-loaded Response
 */
const _fileCache: Map<string, Response> = new Map();

/**
 * Map of configs by prefix - allows multiple StaticPlugin instances
 */
const _configs: Map<string, ResolvedConfig> = new Map();
let _defaultConfig: ResolvedConfig | null = null;

export function setStaticConfig(config: ResolvedConfig): void {
    _defaultConfig = config;
    _configs.set(config.prefix, config);
}

export function getStaticConfig(): ResolvedConfig {
    if (!_defaultConfig) {
        throw new Error('StaticConfig not set. Make sure StaticPlugin.create() was called.');
    }
    return _defaultConfig;
}

export function getStaticConfigByPrefix(prefix: string): ResolvedConfig | undefined {
    return _configs.get(prefix);
}

export function clearStaticConfig(): void {
    _configs.clear();
    _defaultConfig = null;
    _fileCache.clear();
}

/**
 * Cache a file response for production mode.
 */
export function cacheFileResponse(path: string, response: Response): void {
    _fileCache.set(path, response);
}

/**
 * Get cached file response (production mode).
 */
export function getCachedFileResponse(path: string): Response | undefined {
    return _fileCache.get(path);
}

/**
 * Check if running in production mode (files are cached).
 */
export function isProductionMode(): boolean {
    return _fileCache.size > 0;
}
