import { Server } from "bun";
import process from "node:process";
import * as pino from "pino";
import type { ValidatorAdapter, ValidationConfig } from "./validation/ValidatorAdapter";
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
import { executeSimpleRoute } from "./route/FastPathExecutor";
import { LoggerService } from "./services/logger.service";

export interface ApplicationConfig<
  TAdapter extends new (options?: any) => ValidatorAdapter = new (
    options?: any
  ) => ValidatorAdapter
> {
  validation?: ValidationConfig<TAdapter>;
  logger?: pino.LoggerOptions;
  exports?: any[];
  providers?: any[];
  cors?: CorsConfig;
  globalMiddlewares?: any[];
}

const parseUrl = require("parseurl-fast");
// todo: change console.log for LoggerService.
export class Carno {
  router: Memoirist<CompiledRoute | TokenRouteWithProvider> = new Memoirist();  
  private injector = createInjector();
  private corsCache?: CorsHeadersCache;
  private readonly emptyLocals = new LocalsContainer();
  private validatorAdapter: ValidatorAdapter;
  private fetch = async (request: Request, server: Server<any>) => {
    try {
      return await this.fetcher(request, server);
    } catch (error) {
      if (error instanceof HttpException) {
        let response = new Response(
          JSON.stringify({
            message: error.getResponse(),
            statusCode: error.getStatus(),
          }),
          {
            status: error.statusCode,
            headers: { "Content-Type": "application/json" },
          },
        );

        if (this.isCorsEnabled()) {
          const origin = request.headers.get("origin");

          if (origin && this.isOriginAllowed(origin)) {
            response = this.applyCorsHeaders(response, origin);
          }
        }
        return response;
      }

      throw error;
    }
  };
  private server: Server<any>;

  constructor(public config: ApplicationConfig = {}) {
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
  }

  async listen(port: number = 3000) {
    this.registerShutdownHandlers();
    await this.init();
    this.createHttpServer(port);
  }

  private registerShutdownHandlers(): void {
    const shutdown = async (signal: string) => {
      console.log(`\nReceived ${signal}, starting graceful shutdown...`);
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
    console.log(`Server running on port ${port}`);
  }

  private async fetcher(request: Request, server: Server<any>): Promise<Response> {
    if (this.isCorsEnabled()) {
      const origin = request.headers.get("origin");

      if (request.method === "OPTIONS" && origin) {
        return this.handlePreflightRequest(request);
      }
    }

    const urlParsed = parseUrl(request);
    const routePath = this.discoverRoutePath(urlParsed);

    const route = this.router.find(
      request.method.toLowerCase(),
      routePath
    );

    if (!route) {
      throw new HttpException("Method not allowed", 404);
    }

    const compiled = route.store as CompiledRoute;
    const context = Context.createFromRequestSync(urlParsed, request, server);
    context.param = route.params;

    let response: Response;

    const isCompiledRoute = compiled.routeType !== undefined;

    if (isCompiledRoute && compiled.routeType === RouteType.SIMPLE) {
      const result = await executeSimpleRoute(compiled, context);

      response = RouteExecutor.mountResponse(result, context);
    } else {
      const needsLocalsContainer = isCompiledRoute
        ? compiled.needsLocalsContainer
        : true;

      const locals = this.resolveLocalsContainer(
        needsLocalsContainer,
        context
      );

      if (this.injector.hasOnRequestHook()) {
        await this.injector.callHook(EventType.OnRequest, { context });
      }

      response = await RouteExecutor.executeRoute(
        compiled,
        this.injector,
        context,
        locals
      );
    }

    if (this.isCorsEnabled()) {
      const origin = request.headers.get("origin");

      if (origin && this.isOriginAllowed(origin)) {
        response = this.applyCorsHeaders(response, origin);
      }
    }

    return response;
  }

  private catcher = (error: Error) => {
    console.error("Unhandled error:", error);
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
      console.log("Closing HTTP server...");
      this.server.stop(true);
    }
  }

  private exitProcess(code: number = 0): void {
    console.log("Shutdown complete.");
    process.exit(code);
  }

  private reportHookFailure(event: EventType, error: unknown): void {
    console.error(`Lifecycle hook ${event} failed`, error);
  }

  private isCorsEnabled(): boolean {
    return !!this.config.cors;
  }

  private isOriginAllowed(origin: string | null): boolean {
    if (!origin || !this.config.cors) {
      return false;
    }

    const { origins } = this.config.cors;

    if (typeof origins === "string") {
      return origins === "*" || origins === origin;
    }

    if (Array.isArray(origins)) {
      return origins.includes(origin);
    }

    if (origins instanceof RegExp) {
      return origins.test(origin);
    }

    if (typeof origins === "function") {
      return origins(origin);
    }

    return false;
  }

  private handlePreflightRequest(request: Request): Response {
    const origin = request.headers.get("origin");

    if (!this.isOriginAllowed(origin)) {
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

  private discoverRoutePath(url: { pathname?: string; path?: string }): string {
    if (url?.pathname) {
      return url.pathname;
    }
    return url?.path || "/";
  }
}
