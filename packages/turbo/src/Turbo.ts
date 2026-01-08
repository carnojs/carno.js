import 'reflect-metadata';

import { CONTROLLER_META, ROUTES_META, PARAMS_META, MIDDLEWARE_META } from './metadata';
import type { RouteInfo, MiddlewareInfo, ControllerMeta } from './metadata';
import type { ParamMetadata } from './decorators/params';
// RadixRouter removed - using Bun's native SIMD-accelerated router
import { compileHandler } from './compiler/JITCompiler';
import { Context } from './context/Context';
import { Container, Scope } from './container/Container';
import type { Token, ProviderConfig } from './container/Container';
import { CorsHandler, type CorsConfig } from './cors/CorsHandler';
import type { ValidatorAdapter } from './validation/ValidatorAdapter';
import { HttpException } from './exceptions/HttpException';
import { ValidationException } from './validation/ZodAdapter';
import { EventType, hasEventHandlers, getEventHandlers } from './events/Lifecycle';
import { CacheService } from './cache/CacheService';
import type { CacheConfig } from './cache/CacheDriver';
import { DEFAULT_STATIC_ROUTES } from './DefaultRoutes';

export type MiddlewareHandler = (ctx: Context) => Response | void | Promise<Response | void>;

/**
 * Turbo plugin configuration.
 */
export interface TurboConfig {
    exports?: (Token | ProviderConfig)[];
    globalMiddlewares?: MiddlewareHandler[];
    disableStartupLog?: boolean;
    cors?: CorsConfig;
    validation?: ValidatorAdapter | boolean;
    cache?: CacheConfig | boolean;
}

// CompiledRoute removed - handlers are registered directly in Bun's routes

const NOT_FOUND_RESPONSE = new Response('Not Found', { status: 404 });

/**
 * Pre-computed response - frozen and reused.
 */
const TEXT_OPTS = Object.freeze({
    status: 200,
    headers: { 'Content-Type': 'text/plain' }
});

const JSON_OPTS = Object.freeze({
    status: 200,
    headers: { 'Content-Type': 'application/json' }
});

const INTERNAL_ERROR_RESPONSE = new Response(
    '{"statusCode":500,"message":"Internal Server Error"}',
    { status: 500, headers: { 'Content-Type': 'application/json' } }
);

// METHOD_MAP removed - Bun handles method routing natively

/**
 * Turbo Application - Ultra-aggressive performance.
 * 
 * ZERO runtime work in hot path:
 * - All responses pre-created at startup
 * - Direct Bun native routes - no fetch fallback needed
 * - No function calls in hot path
 */
export class Turbo {
    private controllers: any[] = [];
    private services: (Token | ProviderConfig)[] = [];
    private middlewares: MiddlewareHandler[] = [];
    private routes: Record<string, Record<string, Response | Function> | Response | Function> = {};
    private container = new Container();
    private corsHandler: CorsHandler | null = null;
    private hasCors = false;
    private server: any;

    // Cached lifecycle event flags - checked once at startup
    private hasInitHooks = false;
    private hasBootHooks = false;
    private hasShutdownHooks = false;

    constructor(public config: TurboConfig = {}) {
        this.config.exports = this.config.exports || [];
        this.config.globalMiddlewares = this.config.globalMiddlewares || [];

        // Initialize CORS handler if configured
        if (this.config.cors) {
            this.corsHandler = new CorsHandler(this.config.cors);
            this.hasCors = true;
        }
    }

    /**
     * Use a Turbo plugin.
     * Imports exported services and global middlewares from another Turbo instance.
     */
    use(plugin: Turbo): this {
        for (const exported of plugin.config.exports || []) {
            const existingService = this.findServiceInPlugin(plugin, exported);
            const serviceToAdd = this.shouldCloneService(existingService)
                ? { ...existingService }
                : exported;

            this.services.push(serviceToAdd);
        }

        if (plugin.config.globalMiddlewares) {
            this.middlewares.push(...plugin.config.globalMiddlewares);
        }

        return this;
    }

    private findServiceInPlugin(plugin: Turbo, exported: any): any | undefined {
        return plugin.services.find(
            s => this.getServiceToken(s) === this.getServiceToken(exported)
        );
    }

    private getServiceToken(service: any): any {
        return service?.token || service;
    }

    private shouldCloneService(service: any): boolean {
        return !!(service?.useValue !== undefined || service?.useClass);
    }

    /**
     * Register a service/provider.
     */
    service(serviceClass: Token | ProviderConfig): this {
        this.services.push(serviceClass);
        return this;
    }

    /**
     * Register a global middleware.
     */
    middleware(handler: MiddlewareHandler): this {
        this.middlewares.push(handler);
        return this;
    }

    /**
     * Register a controller.
     */
    controller(controllerClass: new () => any): this {
        this.controllers.push(controllerClass);
        return this;
    }

    /**
     * Get a service instance from the container.
     */
    get<T>(token: Token<T>): T {
        return this.container.get(token);
    }

    listen(port: number = 3000): void {
        this.bootstrap();
        this.compileRoutes();

        // All routes go through Bun's native SIMD-accelerated router
        const config: any = {
            port,
            fetch: this.handleNotFound.bind(this),
            error: this.handleError.bind(this),
            routes: {
                ...DEFAULT_STATIC_ROUTES,
                ...this.routes
            }
        };

        this.server = Bun.serve(config);

        // Execute BOOT hooks after server is ready
        if (this.hasBootHooks) {
            this.executeLifecycleHooks(EventType.BOOT);
        }

        // Register shutdown handlers
        if (this.hasShutdownHooks) {
            this.registerShutdownHandlers();
        }

        if (!this.config.disableStartupLog) {
            console.log(`Turbo running on port ${port}`);
        }
    }

    private bootstrap(): void {
        // Cache lifecycle event flags
        this.hasInitHooks = hasEventHandlers(EventType.INIT);
        this.hasBootHooks = hasEventHandlers(EventType.BOOT);
        this.hasShutdownHooks = hasEventHandlers(EventType.SHUTDOWN);

        // Always register CacheService (Memory by default)
        const cacheConfig = typeof this.config.cache === 'object' ? this.config.cache : {};
        this.container.register({
            token: CacheService,
            useValue: new CacheService(cacheConfig)
        });

        for (const service of this.services) {
            this.container.register(service);
        }

        for (const ControllerClass of this.controllers) {
            this.container.register(ControllerClass);
        }

        for (const service of this.services) {
            const token = typeof service === 'function' ? service : service.token;
            const serviceConfig = typeof service === 'function' ? null : service;

            if (!serviceConfig || serviceConfig.scope !== Scope.REQUEST) {
                this.container.get(token);
            }
        }

        // Execute INIT hooks after DI is ready, before server starts
        if (this.hasInitHooks) {
            this.executeLifecycleHooks(EventType.INIT);
        }
    }

    private compileRoutes(): void {
        for (const ControllerClass of this.controllers) {
            this.compileController(ControllerClass);
        }
    }

    private compileController(ControllerClass: new () => any, parentPath: string = ''): void {
        const meta: ControllerMeta = Reflect.getMetadata(CONTROLLER_META, ControllerClass) || { path: '' };
        const basePath = parentPath + (meta.path || '');
        const routes: RouteInfo[] = Reflect.getMetadata(ROUTES_META, ControllerClass) || [];
        const middlewares: MiddlewareInfo[] = Reflect.getMetadata(MIDDLEWARE_META, ControllerClass) || [];
        const instance = this.container.get(ControllerClass);

        for (const route of routes) {
            const fullPath = this.normalizePath(basePath + route.path);
            const params: ParamMetadata[] = Reflect.getMetadata(PARAMS_META, ControllerClass, route.handlerName) || [];
            const routeMiddlewares = middlewares.filter(m => !m.target || m.target === route.handlerName);

            const compiled = compileHandler(instance, route.handlerName, params);

            const allMiddlewares = [
                ...(this.config.globalMiddlewares || []),
                ...this.middlewares,
                ...routeMiddlewares.map(m => m.handler as MiddlewareHandler)
            ];

            const hasMiddlewares = allMiddlewares.length > 0;

            const method = route.method.toUpperCase();

            // Static response - no function needed
            if (compiled.isStatic && !hasMiddlewares) {
                this.registerRoute(fullPath, method, this.createStaticResponse(compiled.staticValue));
            } else {
                // Dynamic handler - compile to Bun-compatible function
                this.registerRoute(fullPath, method, this.createHandler(compiled, params, allMiddlewares));
            }
        }

        // Compile child controllers with parent path
        if (meta.children) {
            for (const ChildController of meta.children) {
                if (!this.container.has(ChildController)) {
                    this.container.register(ChildController);
                }

                this.compileController(ChildController, basePath);
            }
        }
    }

    /**
     * Register a route with Bun's native router format.
     * Path: "/users/:id", Method: "GET", Handler: Function or Response
     */
    private registerRoute(path: string, method: string, handler: Response | Function): void {
        if (!this.routes[path]) {
            this.routes[path] = {};
        }

        (this.routes[path] as Record<string, Response | Function>)[method] = handler;
    }

    private createStaticResponse(value: any): Response {
        const isString = typeof value === 'string';
        const body = isString ? value : JSON.stringify(value);
        const opts = isString ? TEXT_OPTS : JSON_OPTS;

        return new Response(body, opts);
    }

    private createHandler(
        compiled: { fn: Function; isAsync: boolean },
        params: ParamMetadata[],
        middlewares: MiddlewareHandler[]
    ): Function {
        const handler = compiled.fn;
        const hasMiddlewares = middlewares.length > 0;
        const hasParams = params.length > 0;

        // No middlewares, no params - fastest path
        if (!hasMiddlewares && !hasParams) {
            if (compiled.isAsync) {
                return async (req: Request) => {
                    const ctx = new Context(req);
                    const result = await handler(ctx);

                    return this.buildResponse(result);
                };
            }

            return (req: Request) => {
                const ctx = new Context(req);
                const result = handler(ctx);

                return this.buildResponse(result);
            };
        }

        // With params - use Bun's native req.params
        if (!hasMiddlewares && hasParams) {
            if (compiled.isAsync) {
                return async (req: Request) => {
                    const ctx = new Context(req, (req as any).params);
                    const result = await handler(ctx);

                    return this.buildResponse(result);
                };
            }

            return (req: Request) => {
                const ctx = new Context(req, (req as any).params);
                const result = handler(ctx);

                return this.buildResponse(result);
            };
        }

        // With middlewares - full pipeline
        return async (req: Request) => {
            const ctx = new Context(req, (req as any).params || {});

            for (const middleware of middlewares) {
                const result = await middleware(ctx);

                if (result instanceof Response) {
                    return result;
                }
            }

            const result = compiled.isAsync
                ? await handler(ctx)
                : handler(ctx);

            return this.buildResponse(result);
        };
    }

    /**
     * Fallback handler - only called for unmatched routes.
     * All matched routes go through Bun's native router.
     */
    private handleNotFound(req: Request): Response {
        // CORS preflight for unmatched routes
        if (this.hasCors && req.method === 'OPTIONS') {
            const origin = req.headers.get('origin');

            if (origin) {
                return this.corsHandler!.preflight(origin);
            }
        }

        return NOT_FOUND_RESPONSE;
    }

    private buildResponse(result: any): Response {
        if (result instanceof Response) {
            return result;
        }

        if (typeof result === 'string') {
            return new Response(result, TEXT_OPTS);
        }

        return Response.json(result);
    }

    private normalizePath(path: string): string {
        if (!path.startsWith('/')) path = '/' + path;
        if (path !== '/' && path.endsWith('/')) path = path.slice(0, -1);

        return path.replace(/\/+/g, '/');
    }

    private hasParams(path: string): boolean {
        return path.includes(':') || path.includes('*');
    }

    stop(): void {
        this.server?.stop?.();
    }

    /**
     * Error handler for Bun.serve.
     * Converts exceptions to proper HTTP responses.
     */
    private handleError(error: Error): Response {
        // HttpException - return custom response
        if (error instanceof HttpException) {
            return error.toResponse();
        }

        // ValidationException - return 400 with errors
        if (error instanceof ValidationException) {
            return error.toResponse();
        }

        // Unknown error - return 500
        console.error('Unhandled error:', error);
        return INTERNAL_ERROR_RESPONSE;
    }

    /**
     * Execute lifecycle hooks for a specific event type.
     */
    private executeLifecycleHooks(type: EventType): void {
        const handlers = getEventHandlers(type);

        for (const handler of handlers) {
            try {
                const instance = this.container.has(handler.target)
                    ? this.container.get(handler.target)
                    : null;

                if (instance && typeof (instance as any)[handler.methodName] === 'function') {
                    const result = (instance as any)[handler.methodName]();

                    // Handle async hooks
                    if (result instanceof Promise) {
                        result.catch((err: Error) =>
                            console.error(`Error in ${type} hook ${handler.methodName}:`, err)
                        );
                    }
                }
            } catch (err) {
                console.error(`Error in ${type} hook ${handler.methodName}:`, err);
            }
        }
    }

    /**
     * Register SIGTERM/SIGINT handlers for graceful shutdown.
     */
    private registerShutdownHandlers(): void {
        const shutdown = () => {
            this.executeLifecycleHooks(EventType.SHUTDOWN);
            this.stop();
            process.exit(0);
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
    }
}
