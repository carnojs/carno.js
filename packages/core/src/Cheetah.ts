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

    for (const provider of plugin.config.exports || []) {
      this.config.providers.push(provider);
    }

    return this;
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

    for (const controller of controllers) {
      registerController(controller);

      controller.options?.children &&
        controller.options.children.forEach((child: any[]) => {
          registerController({ provide: child, parent: controller.provide });
        });
    }

    for (const provider of providers) {
      registerProvider(provider);
    }
  }

  public async init(): Promise<void> {
    this.loadProvidersAndControllers();
    await this.injector.loadModule(createContainer(), this.config, this.router);
  }

  async listen(port: number = 3000) {
    process.on("SIGTERM", () => {
      void this.handleShutdownHook();
    });
    await this.init();
    this.createHttpServer(port);
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
    return RouteExecutor.executeRoute(
      route.store,
      this.injector,
      context,
      local
    );
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
    } catch (error) {
      this.reportHookFailure(EventType.OnApplicationShutdown, error);
    }
  }

  private reportHookFailure(event: EventType, error: unknown): void {
    console.error(`Lifecycle hook ${event} failed`, error);
  }

  close(closeActiveConnections: boolean = false) {
    this.server?.stop(closeActiveConnections);
  }
}
