import { ApplicationConfig } from "../Cheetah";
import { Injectable } from "../commons/decorators/Injectable.decorator";
import { registerProvider } from "../commons";
import { GlobalProvider, TokenProvider, } from "../commons/registries/ProviderControl";
import { CONTROLLER_EVENTS } from "../constants";
import { DefaultRoutesCheetah } from "../default-routes-cheetah";
import { Context } from "../domain/Context";
import { LocalsContainer } from "../domain/LocalsContainer";
import { Metadata } from "../domain/Metadata";
import { Provider } from "../domain/provider";
import { ProviderScope } from "../domain/provider-scope";
import { EventType, OnEvent } from "../events/on-event";
import Memoirist from "../route/memoirist";
import { LoggerService } from "../services/logger.service";
import { CacheService } from "../cache/cache.service";
import { isPrimitiveType } from "../utils/isPrimitiveType";
import { nameOf } from "../utils/nameOf";
import { ContainerConfiguration, TokenRouteWithProvider, } from "./ContainerConfiguration";
import { Container } from "./container";
import { MiddlewareRes } from "./middleware.resolver";
import { RouteResolver } from "./RouteResolver";
import { DependencyResolver } from "./DependencyResolver";
import { MethodInvoker } from "./MethodInvoker";
import { RequestLogger } from "../services/request-logger.service";

@Injectable()
export class InjectorService {
  settings = new ContainerConfiguration();
  container: Container = new Container();
  applicationConfig: ApplicationConfig = {};
  router: Memoirist<TokenRouteWithProvider>;
  private routeResolver: RouteResolver;
  private dependencyResolver: DependencyResolver;
  private methodInvoker: MethodInvoker;

  async loadModule(
    container: Container,
    applicationConfig: ApplicationConfig,
    router: Memoirist<any>
  ): Promise<void> {
    this.container = container;
    this.router = router;
    this.applicationConfig = applicationConfig;

    this.initializeResolvers();
    this.removeUnknownProviders();
    this.saveInjector();
    this.routeResolver.resolveControllers();
    await this.callHook(EventType.OnApplicationInit);
  }

  private initializeResolvers(): void {
    this.routeResolver = new RouteResolver(
      this.router,
      this.applicationConfig.globalMiddlewares
    );
    this.dependencyResolver = new DependencyResolver(this.container);
    this.methodInvoker = new MethodInvoker(this.applicationConfig);
  }

  private ensureProvider(token: TokenProvider): Provider | undefined {
    if (!this.container.has(token) && GlobalProvider.has(token)) {
      this.container.addProvider(token);
    }

    return this.container.get(token);
  }

  public get(token: TokenProvider): Provider | undefined {
    return this.ensureProvider(token);
  }

  public invoke(
    token: TokenProvider,
    locals: LocalsContainer = new LocalsContainer()
  ): any {
    if (locals.has(token)) {
        const stored: Provider = locals.get(token);
        return stored?.instance ?? stored;
    }

    if (isPrimitiveType(token)) {
      return token;
    }

    const provider = this.ensureProvider(token);
    if (!provider) {
      throw new Error(`Provider not found for: ${nameOf(token)}, check if it was imported into the module or imported without type-only import.`);
    }

    return this.dependencyResolver.resolve(
      provider,
      locals,
      (t, l) => this.invoke(t, l)
    );
  }

  async invokeRoute(
    route: TokenRouteWithProvider,
    context: Context,
    locals: LocalsContainer
  ): Promise<any> {
    await MiddlewareRes.resolveMiddlewares(route, this, locals);

    return this.methodInvoker.invoke(
      route.provider.instance,
      route.methodName,
      locals,
      context,
      (t, l) => this.invoke(t, l)
    );
  }

  scopeOf(provider: Provider): ProviderScope | undefined {
    return provider.scope || ProviderScope.SINGLETON;
  }

  public async callHook(event: EventType, data: unknown = null): Promise<void> {
    const hooks = this.getHooksByEvent(event);

    if (hooks.length === 0) {
      return;
    }

    await this.runHookHandlers(hooks, data ?? {});
  }

  private getHooksByEvent(event: EventType): OnEvent[] {
    const hooks = Metadata.get(CONTROLLER_EVENTS, Reflect) as OnEvent[] | undefined;

    if (!hooks) {
      return [];
    }

    const filtered = hooks.filter((hook: OnEvent) => hook.eventName === event);

    return this.sortHooksByPriority(filtered);
  }

  private sortHooksByPriority(hooks: OnEvent[]): OnEvent[] {
    return hooks.slice().sort((first, second) => {
      return (second.priority ?? 0) - (first.priority ?? 0);
    });
  }

  private async runHookHandlers(hooks: OnEvent[], data: unknown): Promise<void> {
    for (const hook of hooks) {
      await this.executeHook(hook, data);
    }
  }

  private async executeHook(hook: OnEvent, data: unknown): Promise<void> {
    const instance = this.invoke(hook.target) as Record<string, (payload: unknown) => Promise<void> | void>;

    await instance[hook.methodName](data);
  }

  private saveInjector() {
    const provider = this.ensureProvider(InjectorService);
    provider!.instance = this;
    this.container.set(InjectorService, provider!);
  }

  private removeUnknownProviders() {
    if (!GlobalProvider.has(LoggerService)) {
      registerProvider({ provide: LoggerService, useClass: LoggerService, instance: new LoggerService(this) })
    }

    const defaults = [
      InjectorService,
      Context,
      LoggerService,
      DefaultRoutesCheetah,
      CacheService,
        RequestLogger
    ];

    this.applicationConfig.providers = this.applicationConfig.providers || [];
    this.applicationConfig.providers.push(...defaults);

    let hooks = Metadata.get(CONTROLLER_EVENTS, Reflect);

    for (let [token] of GlobalProvider.entries()) {
      if (!this.isProviderAllowed(token)) {
        GlobalProvider.delete(token);

        if (hooks) {
          hooks = hooks.filter((hook: any) => hook.target !== token);
          Metadata.set(CONTROLLER_EVENTS, hooks, Reflect);
        }
      }
    }
  }

  private isProviderAllowed(token: any): boolean {
    if (!this.applicationConfig.providers) {
      return false;
    }

    return this.applicationConfig.providers.some((provider) => {
      if (provider?.provide) {
        return provider.provide === token;
      }

      return provider === token;
    });
  }
}
