import { ApplicationConfig } from "../Cheetah";
import { Injectable } from "../commons/decorators/Injectable.decorator";
import { registerProvider } from "../commons";
import {
  GlobalProvider,
  TokenProvider,
} from "../commons/registries/ProviderControl";
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
import { CachePort } from "../cache/cache.port";
import { isPrimitiveType } from "../utils/isPrimitiveType";
import { nameOf } from "../utils/nameOf";
import {
  ContainerConfiguration,
  TokenRouteWithProvider,
} from "./ContainerConfiguration";
import { Container } from "./container";
import { MiddlewareRes } from "./middleware.resolver";
import { RouteResolver } from "./RouteResolver";
import { DependencyResolver } from "./DependencyResolver";
import { MethodInvoker } from "./MethodInvoker";

@Injectable()
export class InjectorService {
  settings = new ContainerConfiguration();
  container: Container = new Container();
  applicationConfig: ApplicationConfig = {};
  router: Memoirist<TokenRouteWithProvider>;
  private routeResolver: RouteResolver;
  private dependencyResolver: DependencyResolver;
  private methodInvoker: MethodInvoker;

  loadModule(
    container: Container,
    applicationConfig: ApplicationConfig,
    router: Memoirist<any>
  ) {
    this.container = container;
    this.router = router;
    this.applicationConfig = applicationConfig;

    this.initializeResolvers();
    this.removeUnknownProviders();
    this.saveInjector();
    this.routeResolver.resolveControllers();
    this.callHook(EventType.OnApplicationInit);
  }

  private initializeResolvers(): void {
    this.routeResolver = new RouteResolver(this.router);
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
      return locals.get(token);
    }

    if (isPrimitiveType(token)) {
      return token;
    }

    const provider = this.ensureProvider(token);
    if (!provider) {
      throw new Error(`Provider not found for: ${nameOf(token)}`);
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

  public callHook(event: EventType, data: any = null): void {
    const hooks: OnEvent[] | undefined = Metadata.get(
      CONTROLLER_EVENTS,
      Reflect
    );
    if (!hooks) return;

    hooks
      .filter((hook: OnEvent) => hook.eventName === event)
      .forEach(async (hook: OnEvent) => {
        const instance = this.invoke(hook.target);
        // @ts-ignore
        await instance[hook.methodName](data ?? {});
      });
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
      CachePort,
    ];
    this.applicationConfig.providers = this.applicationConfig.providers || [];
    this.applicationConfig.providers.push(...defaults);
    let hooks = Metadata.get(CONTROLLER_EVENTS, Reflect);

    for (let [token] of GlobalProvider.entries()) {
      if (
        !this.applicationConfig.providers ||
        !this.applicationConfig.providers.includes(token)
      ) {
        GlobalProvider.delete(token);

        if (hooks) {
          hooks = hooks.filter((hook: any) => hook.target !== token);
          Metadata.set(CONTROLLER_EVENTS, hooks, Reflect);
        }
      }
    }
  }
}
