import 'reflect-metadata';

import { CONTROLLER_META, ROUTES_META, PARAMS_META, MIDDLEWARE_META } from './metadata';
import type { RouteInfo, MiddlewareInfo } from './metadata';
import type { ParamMetadata } from './decorators/params';
import { RadixRouter } from './router/RadixRouter';
import { compileHandler } from './compiler/JITCompiler';
import { Context } from './context/Context';
import { Container, Scope } from './container/Container';
import type { Token, ProviderConfig } from './container/Container';

export type MiddlewareHandler = (ctx: Context) => Response | void | Promise<Response | void>;

/**
 * Turbo plugin configuration.
 */
export interface TurboConfig {
    exports?: (Token | ProviderConfig)[];
    globalMiddlewares?: MiddlewareHandler[];
    disableStartupLog?: boolean;
}

interface CompiledRoute {
    handler: Function;
    isAsync: boolean;
    isStatic: boolean;
    staticValue?: any;
    middlewares: MiddlewareHandler[];
    hasMiddlewares: boolean;
}

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
    private staticRoutes: Record<string, Response> = {};
    private dynamicRoutes: Record<string, Function> = {};
    private router = new RadixRouter<CompiledRoute>();
    private container = new Container();
    private server: any;

    constructor(public config: TurboConfig = {}) {
        this.config.exports = this.config.exports || [];
        this.config.globalMiddlewares = this.config.globalMiddlewares || [];
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

        const hasStatic = Object.keys(this.staticRoutes).length > 0;
        const hasDynamic = Object.keys(this.dynamicRoutes).length > 0;

        const config: any = {
            port,
            fetch: this.handleRequest.bind(this)
        };

        if (hasStatic) {
            config.static = this.staticRoutes;
        }

        if (hasDynamic) {
            config.routes = this.dynamicRoutes;
        }

        this.server = Bun.serve(config);

        if (!this.config.disableStartupLog) {
            console.log(`Turbo running on port ${port}`);
        }
    }

    /**
     * Bootstrap: register and pre-instantiate all singleton services.
     * This happens BEFORE the server starts.
     */
    private bootstrap(): void {
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
    }

    private compileRoutes(): void {
        for (const ControllerClass of this.controllers) {
            this.compileController(ControllerClass);
        }
    }

    private compileController(ControllerClass: new () => any): void {
        const basePath: string = Reflect.getMetadata(CONTROLLER_META, ControllerClass) || '';
        const routes: RouteInfo[] = Reflect.getMetadata(ROUTES_META, ControllerClass) || [];
        const middlewares: MiddlewareInfo[] = Reflect.getMetadata(MIDDLEWARE_META, ControllerClass) || [];
        const instance = this.container.get(ControllerClass);

        for (const route of routes) {
            const fullPath = this.normalizePath(basePath + route.path);
            const params: ParamMetadata[] = Reflect.getMetadata(PARAMS_META, ControllerClass, route.handlerName) || [];
            const routeMiddlewares = middlewares.filter(m => !m.target || m.target === route.handlerName);

            const compiled = compileHandler(instance, route.handlerName, params);

            const allGlobalMiddlewares = [
                ...(this.config.globalMiddlewares || []),
                ...this.middlewares
            ];

            const compiledRoute: CompiledRoute = {
                handler: compiled.fn,
                isAsync: compiled.isAsync,
                isStatic: compiled.isStatic,
                staticValue: compiled.staticValue,
                middlewares: routeMiddlewares.map(m => m.handler as MiddlewareHandler),
                hasMiddlewares: routeMiddlewares.length > 0 || allGlobalMiddlewares.length > 0
            };

            if (compiled.isStatic && !compiledRoute.hasMiddlewares && route.method === 'get') {
                this.registerStaticRoute(fullPath, compiled.staticValue);
            } else if (!this.hasParams(fullPath) && route.method === 'get' && !compiledRoute.hasMiddlewares) {
                this.registerFastRoute(fullPath, compiledRoute);
            } else {
                this.router.add(route.method, fullPath, compiledRoute);
            }
        }
    }

    private registerStaticRoute(path: string, value: any): void {
        const isString = typeof value === 'string';
        const body = isString ? value : JSON.stringify(value);
        const opts = isString ? TEXT_OPTS : JSON_OPTS;

        this.staticRoutes[path] = new Response(body, opts);
    }

    private registerFastRoute(path: string, route: CompiledRoute): void {
        if (route.isAsync) {
            this.dynamicRoutes[path] = async (req: Request) => {
                const ctx = new Context(req);
                const result = await route.handler(ctx);

                return this.buildResponse(result);
            };
        } else {
            this.dynamicRoutes[path] = (req: Request) => {
                const ctx = new Context(req);
                const result = route.handler(ctx);

                return this.buildResponse(result);
            };
        }
    }

    private handleRequest(req: Request): Response | Promise<Response> {
        const url = req.url;
        const method = req.method.toLowerCase();

        let pathEnd = url.indexOf('?');

        if (pathEnd === -1) pathEnd = url.length;

        let pathStart = url.indexOf('/', 8);

        if (pathStart === -1) pathStart = pathEnd;

        const path = url.slice(pathStart, pathEnd);
        const match = this.router.find(method, path);

        if (!match) {
            return NOT_FOUND_RESPONSE;
        }

        const route = match.store;
        const ctx = new Context(req, match.params);

        if (route.hasMiddlewares) {
            return this.executeWithMiddleware(ctx, route);
        }

        if (route.isAsync) {
            return this.executeAsync(ctx, route);
        }

        return this.buildResponse(route.handler(ctx));
    }

    private async executeWithMiddleware(ctx: Context, route: CompiledRoute): Promise<Response> {
        const allMiddlewares = [
            ...(this.config.globalMiddlewares || []),
            ...this.middlewares,
            ...route.middlewares
        ];

        for (const middleware of allMiddlewares) {
            const result = await middleware(ctx);

            if (result instanceof Response) {
                return result;
            }
        }

        const result = route.isAsync
            ? await route.handler(ctx)
            : route.handler(ctx);

        return this.buildResponse(result);
    }

    private async executeAsync(ctx: Context, route: CompiledRoute): Promise<Response> {
        const result = await route.handler(ctx);

        return this.buildResponse(result);
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
}
