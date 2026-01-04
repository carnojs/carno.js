import { Server } from "bun";
import process from "node:process";
import * as pino from "pino";
import type {
  ValidatorAdapter,
  ValidationConfig,
  ValidatorAdapterConstructor,
} from "./validation/ValidatorAdapter";
import { ZodAdapter } from "./validation/adapters/ZodAdapter";
import { setValidatorAdapter } from "./utils/ValidationCache";
import { registerController, registerProvider } from "./commons/index";
import { CONTROLLER, PROVIDER } from "./constants";
import { TokenRouteWithProvider } from "./container/ContainerConfiguration";
import { createContainer } from "./container/createContainer";
import { createInjector } from "./container/createInjector";
import { Metadata } from "./domain";
import { Context } from "./domain/Context";
import { LocalsContainer } from "./domain/LocalsContainer";
import { Provider } from "./domain/provider";
import { CorsConfig } from "./domain/cors-config";
import { CorsHeadersCache } from "./domain/cors-headers-cache";
import { EventType } from "./events/on-event";
import { HttpException } from "./exceptions/HttpException";
import { RouteExecutor } from "./route/RouteExecutor";
import Memoirist from "./route/memoirist";
import { RouteType, type CompiledRoute } from "./route/CompiledRoute";

import { LoggerService } from "./services/logger.service";

export interface ApplicationConfig<
  TAdapter extends ValidatorAdapterConstructor = ValidatorAdapterConstructor
> {
  validation?: ValidationConfig<TAdapter>;
  logger?: pino.LoggerOptions;
  exports?: any[];
  providers?: any[];
  cors?: CorsConfig;
  globalMiddlewares?: any[];
}

const METHOD_MAP: Record<string, string> = {
  GET: 'get',
  POST: 'post',
  PUT: 'put',
  DELETE: 'delete',
  PATCH: 'patch',
  HEAD: 'head',
  OPTIONS: 'options'
};
export class Carno<
  TAdapter extends ValidatorAdapterConstructor = ValidatorAdapterConstructor    
> {
  router: Memoirist<CompiledRoute | TokenRouteWithProvider> = new Memoirist();  
  private injector = createInjector();
  private corsCache?: CorsHeadersCache;
  private readonly emptyLocals = new LocalsContainer();
  private validatorAdapter: ValidatorAdapter;
  private corsEnabled = false;
  private hasOnRequestHook = false;

  private fetch = (request: Request, server: Server<any>): Response | Promise<Response> => {
    const method = request.method;

    if (this.corsEnabled) {
      const origin = request.headers.get("origin");

      if (method === "OPTIONS" && origin) {
        return this.handlePreflightRequest(request);
      }
    }

    const url = request.url;
    const startIndex = url.indexOf('/', 12);
    const queryIndex = url.indexOf('?', startIndex);

    const pathname = queryIndex === -1
      ? (startIndex === -1 ? '/' : url.slice(startIndex))
      : url.slice(startIndex, queryIndex);

    const methodLower = METHOD_MAP[method] || method.toLowerCase();
    const route = this.router.find(methodLower, pathname);

    if (!route) {
      return this.errorResponse(request, "Method not allowed", 404);
    }

    const compiled = route.store as CompiledRoute;
    const isCompiledRoute = compiled.routeType !== undefined;
    const isSimpleRoute = isCompiledRoute && compiled.routeType === RouteType.SIMPLE;
    const isGetOrHead = method === 'GET' || method === 'HEAD';
    const hasQuery = queryIndex !== -1;

    if (isSimpleRoute && isGetOrHead && !this.corsEnabled && !hasQuery && !compiled.isAsync) {
      const context = Context.createFastContext(request, route.params);

      return compiled.boundHandler!(context);
    }

    return this.fetcherAsync(request, server, route, compiled, isSimpleRoute, hasQuery, queryIndex, url);
  };
  private server: Server<any>;

  constructor(public config: ApplicationConfig<TAdapter> = {}) {
    this.validatorAdapter = this.resolveValidatorAdapter();

    if (config.cors) {
      this.corsCache = new CorsHeadersCache(config.cors);
    }

    void this.bootstrapApplication();
  }

  private resolveValidatorAdapter(): ValidatorAdapter {
    const config = this.config.validation;

    if (!config?.adapter) {
      return new ZodAdapter();
    }

    const AdapterClass = config.adapter;
    const options = config.options || {};

    return new AdapterClass(options);
  }

  /**
   * Use the Carno plugin.
   *
   * @param plugin
   */
  use(plugin: Carno) {
    if (!this.config.providers) {
      this.config.providers = [];
    }

    if (!this.config.globalMiddlewares) {
      this.config.globalMiddlewares = [];
    }

    for (const exportProvider of plugin.config.exports || []) {
      const existingProvider = this.findProviderInConfig(
        plugin,
        exportProvider
      );

      const providerToAdd = this.shouldCloneProvider(existingProvider)
        ? this.cloneProvider(existingProvider)
        : exportProvider;

      this.config.providers.push(providerToAdd);
    }

    if (plugin.config.globalMiddlewares) {
      this.config.globalMiddlewares.push(...plugin.config.globalMiddlewares);
    }

    return this;
  }

  private findProviderInConfig(
    plugin: Carno,
    exportProvider: any
  ): any | undefined {
    return plugin.config.providers?.find(
      (p) => this.getProviderToken(p) === this.getProviderToken(exportProvider)
    );
  }

  private getProviderToken(provider: any): any {
    return provider?.provide || provider;
  }

  private shouldCloneProvider(provider: any): boolean {
    return !!(provider?.useValue !== undefined || provider?.useClass);
  }

  private cloneProvider(provider: any): any {
    return { ...provider };
  }

  /**
   * Set the custom logger provider.
   * The provider must be a class with the @Service() decorator.
   * The provider must extend the LoggerService class.
   *
   * @param provider
   */
  useLogger(provider: any) {
    registerProvider({ provide: LoggerService, useClass: provider });
    return this;
  }

  private loadProvidersAndControllers() {
    const providers = Metadata.get(PROVIDER, Reflect) || [];
    const controllers = Metadata.get(CONTROLLER, Reflect) || [];

    this.registerControllers(controllers);
    this.registerMetadataProviders(providers);
    this.registerConfigProviders();
  }

  private registerControllers(controllers: any[]): void {
    for (const controller of controllers) {
      registerController(controller);

      controller.options?.children &&
        controller.options.children.forEach((child: any[]) => {
          registerController({ provide: child, parent: controller.provide });
        });
    }
  }

  private registerMetadataProviders(providers: any[]): void {
    for (const provider of providers) {
      registerProvider(provider);
    }
  }

  private registerConfigProviders(): void {
    if (!this.config.providers) {
      return;
    }

    for (const provider of this.config.providers) {
      const normalized = this.normalizeProvider(provider);
      registerProvider(normalized);
    }
  }

  private normalizeProvider(provider: any): Partial<Provider> {
    if (provider?.provide) {
      return provider;
    }

    return {
      provide: provider,
      useClass: provider,
    };
  }

  public async init(): Promise<void> {
    setValidatorAdapter(this.validatorAdapter);
    this.loadProvidersAndControllers();

    await this.injector.loadModule(
      createContainer(),
      this.config,
      this.router,
      this.validatorAdapter
    );

    this.corsEnabled = !!this.config.cors;
    this.hasOnRequestHook = this.injector.hasOnRequestHook();
  }

  async listen(port: number = 3000) {
    this.registerShutdownHandlers();
    await this.init();
    this.createHttpServer(port);
  }

  private registerShutdownHandlers(): void {
    const shutdown = async (signal: string) => {
      this.resolveLogger().info(
        `Received ${signal}, starting graceful shutdown...`
      );
      await this.handleShutdownHook();
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  }

  public getHttpServer() {
    return this.server;
  }

  getInjector() {
    return this.injector;
  }

  private createHttpServer(port: number) {
    this.server = Bun.serve({ port, fetch: this.fetch, error: this.catcher });  
    this.resolveLogger().info(`Server running on port ${port}`);
  }

  private async fetcherAsync(
    request: Request,
    server: Server<any>,
    route: any,
    compiled: CompiledRoute,
    isSimpleRoute: boolean,
    hasQuery: boolean,
    queryIndex: number,
    url: string
  ): Promise<Response | any> {
    try {
      let response: any;
      const query = hasQuery ? url.slice(queryIndex + 1) : undefined;
      const context = Context.createFromRequestSync({ query }, request, server);
      context.param = route.params;

      if (isSimpleRoute) {
        response = compiled.isAsync
          ? await compiled.boundHandler!(context)
          : compiled.boundHandler!(context);
      } else {
        const needsLocalsContainer = compiled.routeType !== undefined
          ? compiled.needsLocalsContainer
          : true;

        const locals = this.resolveLocalsContainer(needsLocalsContainer, context);

        if (this.hasOnRequestHook) {
          await this.injector.callHook(EventType.OnRequest, { context });
        }

        response = await RouteExecutor.executeRoute(
          compiled,
          this.injector,
          context,
          locals
        );
      }

      if (this.corsEnabled) {
        const origin = request.headers.get("origin");

        if (origin && this.corsCache!.isOriginAllowed(origin)) {
          if (!(response instanceof Response)) {
              response = RouteExecutor.mountResponse(response, context);
          }
          return this.applyCorsHeaders(response, origin);
        }
      }

      return response;
    } catch (error) {
      if (error instanceof HttpException) {
        return this.errorResponse(request, error.getResponse() as string, error.getStatus());
      }

      throw error;
    }
  }

  private catcher = (error: Error) => {
    this.resolveLogger().error("Unhandled error", error);
    return new Response("Internal Server Error", { status: 500 });
  };

  private async bootstrapApplication(): Promise<void> {
    try {
      await this.injector.callHook(EventType.OnApplicationBoot, {});
    } catch (error) {
      this.reportHookFailure(EventType.OnApplicationBoot, error);
    }
  }

  private async handleShutdownHook(): Promise<void> {
    try {
      await this.injector.callHook(EventType.OnApplicationShutdown);

      this.closeHttpServer();

      this.exitProcess();
    } catch (error) {
      this.reportHookFailure(EventType.OnApplicationShutdown, error);
      this.exitProcess(1);
    }
  }

  private closeHttpServer(): void {
    if (this.server) {
      this.resolveLogger().info("Closing HTTP server...");
      this.server.stop(true);
    }
  }

  private exitProcess(code: number = 0): void {
    this.resolveLogger().info("Shutdown complete.");
    process.exit(code);
  }

  private reportHookFailure(event: EventType, error: unknown): void {
    this.resolveLogger().error(`Lifecycle hook ${event} failed`, error);
  }

  private resolveLogger(): LoggerService {
    const provider = this.injector.get(LoggerService);
    const instance = provider?.instance as LoggerService | undefined;

    return instance ?? new LoggerService(this.injector);
  }

  private isCorsEnabled(): boolean {
    return !!this.config.cors;
  }


  private errorResponse(request: Request, message: string, statusCode: number): Response {
    let response = new Response(
      JSON.stringify({
        message,
        statusCode,
      }),
      {
        status: statusCode,
        headers: { "Content-Type": "application/json" },
      },
    );

    if (this.corsEnabled) {
      const origin = request.headers.get("origin");

      if (origin && this.corsCache!.isOriginAllowed(origin)) {
        response = this.applyCorsHeaders(response, origin);
      }
    }

    return response;
  }

  private handlePreflightRequest(request: Request): Response {
    const origin = request.headers.get("origin");

    if (!origin || !this.corsCache!.isOriginAllowed(origin)) {
      return new Response(null, { status: 403 });
    }

    const corsHeaders = this.corsCache!.get(origin!);

    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  private applyCorsHeaders(response: Response, origin: string): Response {      
    return this.corsCache!.applyToResponse(response, origin);
  }

  close(closeActiveConnections: boolean = false) {
    this.server?.stop(closeActiveConnections);
  }

  private resolveLocalsContainer(
    needsLocalsContainer: boolean,
    context: Context
  ): LocalsContainer {
    if (!needsLocalsContainer) {
      return this.emptyLocals;
    }

    return this.buildLocalsContainer(context);
  }

  private buildLocalsContainer(context: Context): LocalsContainer {
    const locals = new LocalsContainer();

    locals.set(Context, context);

    return locals;
  }

  private discoverRoutePath(url: string | { pathname?: string; path?: string }): string {
    if (typeof url === 'string') {
      return url;
    }

    return url?.pathname || url?.path || '/';
  }
}
