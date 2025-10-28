import { Server } from "bun";
import { ValidatorOptions } from "class-validator";
import process from "node:process";
import * as pino from "pino";
import { registerController, registerProvider } from "./commons/index";
import { CONTROLLER, PROVIDER } from "./constants";
import { TokenRouteWithProvider } from "./container/ContainerConfiguration";
import { createContainer } from "./container/createContainer";
import { createInjector } from "./container/createInjector";
import { Metadata } from "./domain";
import { Context } from "./domain/Context";
import { LocalsContainer } from "./domain/LocalsContainer";
import { Provider } from "./domain/provider";
import { CorsConfig, DEFAULT_CORS_METHODS, DEFAULT_CORS_ALLOWED_HEADERS, CorsOrigin } from "./domain/cors-config";
import { EventType } from "./events/on-event";
import { HttpException } from "./exceptions/HttpException";
import { RouteExecutor } from "./route/RouteExecutor";
import Memoirist from "./route/memoirist";
import { LoggerService } from "./services/logger.service";

export interface ApplicationConfig {
  validation?: ValidatorOptions;
  logger?: pino.LoggerOptions;
  exports?: any[];
  providers?: any[];
  cors?: CorsConfig;
}

const parseUrl = require("parseurl-fast");
// todo: change console.log for LoggerService.
export class Cheetah {
  router: Memoirist<TokenRouteWithProvider> = new Memoirist();
  private injector = createInjector();
  private fetch = (request: Request, server: Server<any>) =>
    this.fetcher(request, server);
  private server: Server<any>;

  constructor(public config: ApplicationConfig = {}) {
    void this.bootstrapApplication();
  }

  /**
   * Use the Cheetah plugin.
   *
   * @param plugin
   */
  use(plugin: Cheetah) {
    if (!this.config.providers) {
      this.config.providers = [];
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

    return this;
  }

  private findProviderInConfig(
    plugin: Cheetah,
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
    this.loadProvidersAndControllers();
    await this.injector.loadModule(createContainer(), this.config, this.router);
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

    const context = await Context.createFromRequest(urlParsed, request, server);
    await this.injector.callHook(EventType.OnRequest, { context });
    const local = new LocalsContainer();

    const route = this.router.find(
      request.method.toLowerCase(),
      urlParsed.path
    );

    if (!route) {
      throw new HttpException("Method not allowed", 404);
    }

    context.param = route.params;

    local.set(Context, context);

    let response = await RouteExecutor.executeRoute(
      route.store,
      this.injector,
      context,
      local
    );

    if (this.isCorsEnabled()) {
      const origin = request.headers.get("origin");

      if (origin && this.isOriginAllowed(origin)) {
        response = this.applyCorsHeaders(response, origin);
      }
    }

    return response;
  }

  private catcher = (error: Error) => {
    if (error instanceof HttpException) {
      return new Response(
        JSON.stringify({
          message: error.getResponse(),
          statusCode: error.getStatus(),
        }),
        {
          status: error.statusCode,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(error.message, { status: 500 });
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

  private buildCorsHeaders(origin: string): Record<string, string> {
    const cors = this.config.cors!;
    const headers: Record<string, string> = {};

    const allowedOrigin =
      typeof cors.origins === "string" && cors.origins === "*"
        ? "*"
        : origin;

    headers["Access-Control-Allow-Origin"] = allowedOrigin;

    if (cors.credentials) {
      headers["Access-Control-Allow-Credentials"] = "true";
    }

    const methods = cors.methods || DEFAULT_CORS_METHODS;
    headers["Access-Control-Allow-Methods"] = methods.join(", ");

    const allowedHeaders = cors.allowedHeaders || DEFAULT_CORS_ALLOWED_HEADERS;
    headers["Access-Control-Allow-Headers"] = allowedHeaders.join(", ");

    if (cors.exposedHeaders && cors.exposedHeaders.length > 0) {
      headers["Access-Control-Expose-Headers"] = cors.exposedHeaders.join(", ");
    }

    if (cors.maxAge !== undefined) {
      headers["Access-Control-Max-Age"] = cors.maxAge.toString();
    }

    return headers;
  }

  private handlePreflightRequest(request: Request): Response | null {
    const origin = request.headers.get("origin");

    if (!this.isOriginAllowed(origin)) {
      return new Response(null, { status: 403 });
    }

    const corsHeaders = this.buildCorsHeaders(origin!);

    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  private applyCorsHeaders(response: Response, origin: string): Response {
    const corsHeaders = this.buildCorsHeaders(origin);

    const newHeaders = new Headers(response.headers);

    for (const [key, value] of Object.entries(corsHeaders)) {
      newHeaders.set(key, value);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  }

  close(closeActiveConnections: boolean = false) {
    this.server?.stop(closeActiveConnections);
  }
}
