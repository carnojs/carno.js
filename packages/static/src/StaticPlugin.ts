import { Carno, Service } from '@carno.js/core';
import { StaticController } from './StaticController';
import { setStaticConfig, cacheFileResponse } from './config';
import { getMimeType } from './MimeTypes';
import { listFiles, normalizePath } from './utils';
import type { StaticPluginConfig, ResolvedConfig } from './types';
import * as path from 'path';

const DEFAULT_IGNORE = ['.DS_Store', '.git', '.env'];

@Service()
export class StaticPlugin {
    public config: ResolvedConfig;

    constructor(config: StaticPluginConfig = {}) {
        this.config = {
            root: path.resolve(config.root || 'public'),
            prefix: config.prefix || '/',
            index: config.index || 'index.html',
            cacheControl: config.cacheControl ?? 'public, max-age=3600',
            spa: config.spa ?? false,
            dotFiles: config.dotFiles ?? false,
            extensions: config.extensions || [],
            alwaysStatic: config.alwaysStatic ?? (process.env.NODE_ENV === 'production'),
            staticLimit: config.staticLimit ?? 1024,
            ignorePatterns: config.ignorePatterns || DEFAULT_IGNORE,
        };
    }

    /**
     * Create a Carno plugin instance for static file serving.
     * 
     * @example
     * ```ts
     * const app = new Carno();
     * app.use(await StaticPlugin.create({ root: './public' }));
     * app.listen(3000);
     * ```
     */
    static async create(config?: StaticPluginConfig): Promise<Carno> {
        const staticPlugin = new StaticPlugin(config);
        const pluginConfig = staticPlugin.config;

        const plugin = new Carno({
            exports: []
        });

        // Set global config for StaticController (still used optionally)
        setStaticConfig(pluginConfig);

        // Production: Pre-load files into memory
        if (pluginConfig.alwaysStatic) {
            // Strategy: Register individual routes for maximum performance
            await staticPlugin.registerStaticRoutes(plugin);
        } else {
            // Development: Use wildcard route with closure to capture config
            // This supports multiple plugins with different configs
            // Development: Use wildcard route with closure to capture config
            // This supports multiple plugins with different configs
            const routePath = normalizePath(path.join(pluginConfig.prefix, '*'));

            // Dynamic handler captures 'pluginConfig' in closure
            const handler = async (req: Request) => {
                const { Context } = require('@carno.js/core');
                const { serveStatic } = require('./serveStatic');

                // Manually construct Context since we are using raw route handler
                const ctx = new Context(req, (req as any).params || {});

                return serveStatic(ctx, pluginConfig);
            };

            plugin.route('GET', routePath, handler);

            // Also register the exact prefix path matches (without wildcard)
            if (pluginConfig.prefix !== '/' && pluginConfig.prefix !== '') {
                plugin.route('GET', pluginConfig.prefix, handler);
            }
        }

        return plugin;
    }


    /**
     * Register individual static routes (production mode).
     * Each file gets its own route for maximum performance.
     */
    private async registerStaticRoutes(plugin: Carno): Promise<void> {
        const files = await listFiles(this.config.root);

        // Fall back to controller if too many files
        if (files.length > this.config.staticLimit) {
            console.warn(
                `[@carno.js/static] Too many files (${files.length} > ${this.config.staticLimit}). ` +
                `Falling back to controller mode. Increase staticLimit if needed.`
            );
            plugin.controllers(StaticController);
            // Also pre-load into cache for controller to use
            await this.preloadFilesIntoCache();
            return;
        }

        console.log(`[@carno.js/static] Registering ${files.length} static routes...`);

        for (const absolutePath of files) {
            if (this.shouldIgnore(absolutePath)) continue;
            if (!this.isValidFile(absolutePath)) continue;

            const relativePath = path.relative(this.config.root, absolutePath);
            const routePath = normalizePath(path.join(this.config.prefix, relativePath));

            const file = Bun.file(absolutePath);
            if (!(await file.exists())) continue;

            const headers: Record<string, string> = {
                'Content-Type': getMimeType(absolutePath)
            };

            if (this.config.cacheControl) {
                headers['Cache-Control'] = this.config.cacheControl;
            }

            // Register route using new Carno API
            // Each request clones the response for isolated reads
            plugin.route('GET', routePath, () => new Response(file, { headers }));

            // Also register index routes
            const indexFiles = Array.isArray(this.config.index)
                ? this.config.index
                : [this.config.index];

            for (const indexFile of indexFiles) {
                if (routePath.endsWith(`/${indexFile}`)) {
                    const dirPath = routePath.replace(`/${indexFile}`, '') || '/';
                    if (this.config.prefix === '/' || dirPath.startsWith(this.config.prefix)) {
                        plugin.route('GET', dirPath, () => new Response(file, { headers }));
                    }
                }
            }
        }

        console.log(`[@carno.js/static] Registered ${files.length} routes successfully`);

        // If SPA mode, also register controller for fallback
        if (this.config.spa) {
            plugin.controllers(StaticController);
        }
    }

    /**
     * Pre-load all files into memory cache (production mode).
     * Controller will serve from cache for zero I/O at runtime.
     */
    private async preloadFilesIntoCache(): Promise<void> {
        const files = await listFiles(this.config.root);

        // Fall back to dynamic mode if too many files
        if (files.length > this.config.staticLimit) {
            console.warn(
                `[@carno.js/static] Too many files (${files.length} > ${this.config.staticLimit}). ` +
                `Using dynamic mode. Increase staticLimit or set alwaysStatic: false`
            );
            return; // Controller will serve dynamically
        }

        console.log(`[@carno.js/static] Pre-loading ${files.length} files into memory...`);

        for (const absolutePath of files) {
            if (this.shouldIgnore(absolutePath)) continue;
            if (!this.isValidFile(absolutePath)) continue;

            const relativePath = path.relative(this.config.root, absolutePath);
            const routePath = normalizePath(path.join(this.config.prefix, relativePath));

            // Remove prefix for cache key (controller uses path without prefix)
            const cacheKey = routePath.startsWith(this.config.prefix)
                ? routePath.slice(this.config.prefix.length) || '/'
                : routePath;

            const file = Bun.file(absolutePath);
            if (!(await file.exists())) continue;

            const headers: Record<string, string> = {
                'Content-Type': getMimeType(absolutePath)
            };

            if (this.config.cacheControl) {
                headers['Cache-Control'] = this.config.cacheControl;
            }

            // Pre-load file into Response and cache it
            const response = new Response(file, { headers });
            cacheFileResponse(cacheKey, response);

            // Also cache index routes
            const indexFiles = Array.isArray(this.config.index)
                ? this.config.index
                : [this.config.index];

            for (const indexFile of indexFiles) {
                if (cacheKey.endsWith(`/${indexFile}`)) {
                    const dirPath = cacheKey.replace(`/${indexFile}`, '') || '/';
                    cacheFileResponse(dirPath, response);
                }
            }
        }

        console.log(`[@carno.js/static] Pre-loaded ${files.length} files successfully`);
    }


    private shouldIgnore(filePath: string): boolean {
        const filename = path.basename(filePath);

        for (const pattern of this.config.ignorePatterns) {
            if (typeof pattern === 'string') {
                if (filename === pattern || filePath.includes(pattern)) {
                    return true;
                }
            } else if (pattern.test(filePath)) {
                return true;
            }
        }

        // Check dotfiles
        if (!this.config.dotFiles) {
            const parts = filePath.split(path.sep);
            if (parts.some(p => p.startsWith('.') && p !== '.')) {
                return true;
            }
        }

        return false;
    }

    private isValidFile(filePath: string): boolean {
        // Check extensions whitelist
        if (this.config.extensions.length > 0) {
            const ext = path.extname(filePath).slice(1).toLowerCase();
            if (!this.config.extensions.includes(ext)) {
                return false;
            }
        }
        return true;
    }
}
