import type { ApplicationConfig } from "../Carno";
import { Injectable } from "../commons/decorators/Injectable.decorator";
import { registerProvider } from "../commons";
import { GlobalProvider, TokenProvider, } from "../commons/registries/ProviderControl";
import { CONTROLLER_EVENTS } from "../constants";
import { DefaultRoutesCarno } from "../default-routes-carno";
import { Context } from "../domain/Context";
import { LocalsContainer } from "../domain/LocalsContainer";
import { Metadata } from "../domain/Metadata";
import { Provider } from "../domain/provider";
import { ProviderScope } from "../domain/provider-scope";
import { ProviderType } from "../domain/provider-type";
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
import { RouteCompiler } from "../route/RouteCompiler";
import type { CompiledRoute } from "../route/CompiledRoute";

@Injectable()
export class InjectorService {
  settings = new ContainerConfiguration();
  container: Container = new Container();
  applicationConfig: ApplicationConfig = {};
  router: Memoirist<TokenRouteWithProvider>;
  private hooksByEvent: Map<EventType, OnEvent[]> = new Map();
  private _hasOnRequestHook: boolean = false;
  private _hasOnResponseHook: boolean = false;
  private controllerScopes: Map<TokenProvider, ProviderScope> = new Map();
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
    this.cacheControllerScopes();
    this.preInstantiateSingletonControllers();
    this.cacheHooks();
    this.compileRoutes();
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

  public resolveControllerInstance(
    token: TokenProvider,
    locals: LocalsContainer
  ): any {
    const provider = this.ensureProvider(token);

    if (!provider) {
      const message =
        `Provider not found for: ${nameOf(token)}, check if it was ` +
        `imported into the module or imported without type-only import.`;

      throw new Error(message);
    }

    const scope = this.getControllerScope(provider);

    if (scope !== ProviderScope.SINGLETON) {
      return this.invoke(token, locals);
    }

    if (provider.instance) {
      return provider.instance;
    }

    return this.invoke(token, locals);
  }

  async invokeRoute(
    route: TokenRouteWithProvider,
    context: Context,
    locals: LocalsContainer,
    instance: any
  ): Promise<any> {
    await MiddlewareRes.resolveMiddlewares(route, this, locals);

    const result = await this.methodInvoker.invoke(
      instance,
      route.methodName,
      locals,
      context,
      (t, l) => this.invoke(t, l)
    );

    return result;
  }

  scopeOf(provider: Provider): ProviderScope | undefined {
    return provider.scope || ProviderScope.SINGLETON;
  }

  public async callHook(event: EventType, data: unknown = null): Promise<void> {
    const hooks = this.getCachedHooks(event);

    if (hooks.length === 0) {
      return;
    }

    await this.runHookHandlers(hooks, data ?? {});
  }

  private getCachedHooks(event: EventType): OnEvent[] {
    return this.hooksByEvent.get(event) ?? [];
  }

  private cacheHooks(): void {
    this.hooksByEvent = this.buildHooksByEvent();
    this._hasOnRequestHook = (this.hooksByEvent.get(EventType.OnRequest)?.length ?? 0) > 0;
    this._hasOnResponseHook = (this.hooksByEvent.get(EventType.OnResponse)?.length ?? 0) > 0;
  }

  hasHook(event: EventType): boolean {
    if (event === EventType.OnRequest) {
      return this._hasOnRequestHook;
    }

    if (event === EventType.OnResponse) {
      return this._hasOnResponseHook;
    }

    return (this.hooksByEvent.get(event)?.length ?? 0) > 0;
  }

  hasOnRequestHook(): boolean {
    return this._hasOnRequestHook;
  }

  hasOnResponseHook(): boolean {
    return this._hasOnResponseHook;
  }

  private cacheControllerScopes(): void {
    const controllers = this.getControllers();

    this.controllerScopes = this.buildControllerScopeMap(controllers);
  }

  private buildControllerScopeMap(
    controllers: Provider[]
  ): Map<TokenProvider, ProviderScope> {
    const scoped = new Map<TokenProvider, ProviderScope>();

    controllers.forEach((controller) => {
      const scope = this.dependencyResolver.resolveScope(controller);

      scoped.set(controller.token, scope);
    });

    return scoped;
  }

  private getControllers(): Provider[] {
    const controllers = GlobalProvider.getByType(ProviderType.CONTROLLER);

    return controllers;
  }

  private getControllerScope(controller: Provider): ProviderScope {
    const cached = this.controllerScopes.get(controller.token);

    if (cached) {
      return cached;
    }

    const scope = this.dependencyResolver.resolveScope(controller);

    this.controllerScopes.set(controller.token, scope);

    return scope;
  }

  private preInstantiateSingletonControllers(): void {
    const controllers = this.getControllers();

    for (const controller of controllers) {
      const scope = this.getControllerScope(controller);

      if (scope !== ProviderScope.SINGLETON) {
        continue;
      }

      this.ensureControllerInstance(controller);
    }
  }


  private compileRoutes(): void {
    const compiler = new RouteCompiler({
      container: this.container,
      controllerScopes: this.controllerScopes,
      validationConfig: this.applicationConfig.validation,
      hasOnRequestHook: this._hasOnRequestHook,
      hasOnResponseHook: this._hasOnResponseHook,
    });

    const routesToCompile = [...this.router.history];

    for (const [method, path, store] of routesToCompile) {
      if (!store || (store as any).routeType !== undefined) {
        continue;
      }

      const compiled = compiler.compile(store as TokenRouteWithProvider);

      if (!compiled) {
        continue;
      }

      this.router.updateStore(
        method,
        path,
        store as TokenRouteWithProvider,
        compiled as any
      );
    }
  }

  private ensureControllerInstance(controller: Provider): void {
    if (controller.instance) {
      return;
    }

    this.invoke(controller.token);
  }

  private buildHooksByEvent(): Map<EventType, OnEvent[]> {
    const hooks = this.readAllHooks();
    return this.groupHooksByEvent(hooks);
  }

  private readAllHooks(): OnEvent[] {
    return Metadata.get(CONTROLLER_EVENTS, Reflect) ?? [];
  }

  private groupHooksByEvent(hooks: OnEvent[]): Map<EventType, OnEvent[]> {
    const grouped = new Map<EventType, OnEvent[]>();
    hooks.forEach((hook) => this.appendHook(grouped, hook));
    return this.sortHookMap(grouped);
  }

  private appendHook(grouped: Map<EventType, OnEvent[]>, hook: OnEvent): void {
    const list = grouped.get(hook.eventName) ?? [];
    list.push(hook);
    grouped.set(hook.eventName, list);
  }

  private sortHookMap(
    grouped: Map<EventType, OnEvent[]>
  ): Map<EventType, OnEvent[]> {
    const sorted = new Map<EventType, OnEvent[]>();
    grouped.forEach((hooks, event) => this.sortAndStore(sorted, event, hooks));
    return sorted;
  }

  private sortAndStore(
    target: Map<EventType, OnEvent[]>,
    event: EventType,
    hooks: OnEvent[]
  ): void {
    target.set(event, this.sortHooksByPriority(hooks));
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
      DefaultRoutesCarno,
      CacheService
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
