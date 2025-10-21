import { TokenProvider } from "../commons/registries/ProviderControl";
import { LocalsContainer } from "../domain/LocalsContainer";
import { Metadata } from "../domain/Metadata";
import { Provider } from "../domain/provider";
import { ProviderScope } from "../domain/provider-scope";
import { getClassOrSymbol } from "../utils/getClassOrSymbol";
import { isPrimitiveType } from "../utils/isPrimitiveType";
import { Container } from "./container";

export class DependencyResolver {
  constructor(private container: Container) {}

  resolve(
    provider: Provider,
    locals: LocalsContainer,
    invokeCallback: (token: TokenProvider, locals: LocalsContainer) => any
  ): any {
    if (provider.instance) return provider.instance;

    this.validateProvider(provider);

    const scope = this.determineScope(provider);
    const instance = this.createInstance(provider, invokeCallback, locals);

    return this.handleScope(provider, instance, scope, locals);
  }

  private validateProvider(provider: Provider): void {
    if (!provider.useClass && !provider.useValue) {
      throw new Error("Provider not found.");
    }
  }

  private determineScope(provider: Provider): ProviderScope {
    if (provider.scope === ProviderScope.REQUEST) {
      return ProviderScope.REQUEST;
    }

    const deps = this.getConstructorDependencies(provider.useClass);
    const hasRequestDep = this.hasRequestScopeDependency(deps);

    return hasRequestDep ? ProviderScope.REQUEST : ProviderScope.SINGLETON;
  }

  private hasRequestScopeDependency(deps: TokenProvider[]): boolean {
    if (deps.length === 0) return false;

    return deps.some((dep) => {
      const depProvider = this.container.get(dep);
      return depProvider?.scope === ProviderScope.REQUEST;
    });
  }

  private createInstance(
    provider: Provider,
    invokeCallback: (token: TokenProvider, locals: LocalsContainer) => any,
    locals: LocalsContainer
  ): any {
    if (provider.useValue) {
      return provider.useValue;
    }

    const deps = this.getConstructorDependencies(provider.useClass);
    const services = this.resolveServices(deps, invokeCallback, locals);

    return new provider.useClass(...services);
  }

  private resolveServices(
    deps: TokenProvider[],
    invokeCallback: (token: TokenProvider, locals: LocalsContainer) => any,
    locals: LocalsContainer
  ): any[] {
    return deps
      .filter((t) => !isPrimitiveType(t))
      .map((token) => invokeCallback(getClassOrSymbol(token), locals));
  }

  private handleScope(
    provider: Provider,
    instance: any,
    scope: ProviderScope,
    locals: LocalsContainer
  ): any {
    switch (scope) {
      case ProviderScope.SINGLETON:
        return this.handleSingleton(provider, instance);
      case ProviderScope.REQUEST:
        return this.handleRequest(provider, instance, locals);
      default:
        return instance;
    }
  }

  private handleSingleton(provider: Provider, instance: any): any {
    provider.instance = instance;
    this.container.addProvider(provider.token, provider);
    return instance;
  }

  private handleRequest(
    provider: Provider,
    instance: any,
    locals: LocalsContainer
  ): any {
    const clone = provider.clone();
    clone.instance = instance;
    locals.set(clone.token, clone);
    return instance;
  }

  getConstructorDependencies(
    target: TokenProvider,
    propertyKey?: string | symbol | undefined
  ): TokenProvider[] {
    return (
      Metadata.getOwn(
        "override:ctor:design:paramtypes",
        target,
        propertyKey
      ) ||
      [...Metadata.getParamTypes(target, propertyKey)] ||
      []
    );
  }
}
