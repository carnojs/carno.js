import {
  GlobalProvider,
  TokenProvider,
} from "../commons/registries/ProviderControl";
import {
  CONTROLLER_MIDDLEWARES,
  CONTROLLER_ROUTES,
  ROUTE_MIDDLEWARES,
} from "../constants";
import { HttpMethod } from "../domain";
import { Metadata } from "../domain/Metadata";
import { Provider } from "../domain/provider";
import { ProviderType } from "../domain/provider-type";
import { TokenRouteWithProvider } from "./ContainerConfiguration";
import Memoirist from "../route/memoirist";

export class RouteResolver {
  private globalMiddlewares: any[] = [];

  constructor(
    private router: Memoirist<TokenRouteWithProvider>,
    globalMiddlewares?: any[]
  ) {
    this.globalMiddlewares = globalMiddlewares || [];
  }

  resolveControllers(): void {
    const controllers = this.getTopLevelControllers();
    const hydrateRoute = this.buildRouteMap(controllers);
    this.registerRoutes(hydrateRoute);
  }

  private getTopLevelControllers(): Provider[] {
    return GlobalProvider.getByType(ProviderType.CONTROLLER).filter(
      (controller) => !controller.isChild()
    );
  }

  private buildRouteMap(
    controllers: Provider[]
  ): Map<string, TokenRouteWithProvider[]> {
    const hydrateRoute: Map<string, TokenRouteWithProvider[]> = new Map();

    for (const controller of controllers) {
      this.processController(controller, hydrateRoute);
    }

    return hydrateRoute;
  }

  private processController(
    controller: Provider,
    hydrateRoute: Map<string, TokenRouteWithProvider[]>
  ): void {
    const routes = this.getControllerRoutes(controller);
    if (routes.length === 0) return;

    const controllerMiddleware = this.getControllerMiddlewares(controller);
    const processedRoutes = this.applyControllerPath(controller, routes);

    this.addRoutesToMap(
      hydrateRoute,
      processedRoutes,
      controller,
      controllerMiddleware
    );
    this.processChildren(controller, hydrateRoute, controllerMiddleware);
  }

  private getControllerRoutes(controller: Provider): any[] {
    return Metadata.get(CONTROLLER_ROUTES, controller.token);
  }

  private getControllerMiddlewares(controller: Provider): any[] {
    return Metadata.get(CONTROLLER_MIDDLEWARES, controller.token) || [];
  }

  private applyControllerPath(controller: Provider, routes: any[]): any[] {
    if (!controller.path) return routes;

    return routes.map((route: any) => ({
      ...route,
      path: this.normalizePath(`${controller.path}${route.path}`),
    }));
  }

  private normalizePath(path: string): string {
    let normalized = path.endsWith("/") ? path.slice(0, -1) : path;
    return normalized.startsWith("/") ? normalized : `/${normalized}`;
  }

  private addRoutesToMap(
    hydrateRoute: Map<string, TokenRouteWithProvider[]>,
    routes: any[],
    controller: Provider,
    controllerMiddleware: any[]
  ): void {
    for (const method of Object.keys(HttpMethod).map(
      (key) => HttpMethod[key]
    )) {
      const methodRoutes = this.filterRoutesByMethod(routes, method);
      if (methodRoutes.length === 0) continue;

      this.addMethodRoutes(
        hydrateRoute,
        method,
        methodRoutes,
        controller,
        controllerMiddleware
      );
    }
  }

  private filterRoutesByMethod(routes: any[], method: string): any[] {
    return routes.filter(
      (route: any) => route.method.toLowerCase() === method
    );
  }

  private addMethodRoutes(
    hydrateRoute: Map<string, TokenRouteWithProvider[]>,
    method: string,
    routes: any[],
    controller: Provider,
    controllerMiddleware: any[]
  ): void {
    const mappedRoutes = routes.map((route: any) =>
      this.createTokenRouteWithProvider(route, controller, controllerMiddleware)
    );

    hydrateRoute.set(method, [
      ...(hydrateRoute.get(method) || []),
      ...mappedRoutes,
    ]);
  }

  private createTokenRouteWithProvider(
    route: any,
    controller: Provider,
    controllerMiddleware: any[]
  ): TokenRouteWithProvider {
    return {
      ...route,
      provider: controller.token,
      route,
      middlewares: [
        ...this.globalMiddlewares,
        ...controllerMiddleware,
        ...(Metadata.get(
          ROUTE_MIDDLEWARES,
          controller.token,
          route.methodName
        ) || []),
      ],
    };
  }

  private processChildren(
    controller: Provider,
    hydrateRoute: Map<string, TokenRouteWithProvider[]>,
    controllerMiddleware: any[]
  ): void {
    if (!controller.children) return;

    const childrenRoutes = this.resolveChildrenRoutes(
      controller.path ?? "",
      controller.children,
      controllerMiddleware
    );

    childrenRoutes.forEach((route) => {
      const method = route.method.toLowerCase();
      hydrateRoute.set(method, [
        ...(hydrateRoute.get(method) || []),
        route,
      ]);
    });
  }

  private resolveChildrenRoutes(
    parentPath: string,
    children: Provider[],
    parentMiddlewares: any[]
  ): TokenRouteWithProvider[] {
    let childrenRoutes: any[] = [];

    for (const childController of children) {
      const routes = this.processChildController(
        childController,
        parentPath,
        parentMiddlewares
      );
      childrenRoutes = [...childrenRoutes, ...routes];
    }

    return childrenRoutes;
  }

  private processChildController(
    childController: TokenProvider,
    parentPath: string,
    parentMiddlewares: any[]
  ): TokenRouteWithProvider[] {
    const controller = this.getValidChildController(childController);
    const childRoutes = this.getControllerRoutes(controller);
    if (childRoutes.length === 0) return [];

    const childMiddlewares = this.getControllerMiddlewares(controller);
    const processedRoutes = this.applyChildPaths(
      childRoutes,
      parentPath,
      controller
    );

    return this.buildChildRoutes(
      processedRoutes,
      controller,
      parentMiddlewares,
      childMiddlewares
    );
  }

  private getValidChildController(
    childController: TokenProvider
  ): Provider {
    const controller = GlobalProvider.get(childController);

    if (!controller) {
      throw new Error(
        `Child ${childController} not is an controller. Please, check the providers configuration.`
      );
    }

    return controller;
  }

  private applyChildPaths(
    routes: any[],
    parentPath: string,
    controller: Provider
  ): any[] {
    if (!parentPath) return routes;

    return routes.map((route: any) => ({
      ...route,
      path: this.buildChildPath(parentPath, controller.path, route.path),
    }));
  }

  private buildChildPath(
    parentPath: string,
    controllerPath: string | undefined,
    routePath: string
  ): string {
    let path = controllerPath ?? "";

    if (path.endsWith("/")) {
      path = path.slice(0, -1);
    }

    if (!path.startsWith("/") && path) {
      path = `/${path}`;
    }

    const fullPath = `${parentPath}${path}${routePath}`;
    return this.normalizePath(fullPath);
  }

  private buildChildRoutes(
    routes: any[],
    controller: Provider,
    parentMiddlewares: any[],
    childMiddlewares: any[]
  ): TokenRouteWithProvider[] {
    let childRoutes: TokenRouteWithProvider[] = [];

    for (const method of Object.keys(HttpMethod).map(
      (key) => HttpMethod[key]
    )) {
      const methodRoutes = this.filterRoutesByMethod(routes, method);
      if (methodRoutes.length === 0) continue;

      const mappedRoutes = methodRoutes.map((route: any) => ({
        ...route,
        provider: controller.token,
        route,
        middlewares: [
          ...this.globalMiddlewares,
          ...parentMiddlewares,
          ...childMiddlewares,
          ...(Metadata.get(
            ROUTE_MIDDLEWARES,
            controller.token,
            route.methodName
          ) || []),
        ],
      }));

      childRoutes = [...childRoutes, ...mappedRoutes];
    }

    if (controller.children) {
      const nestedRoutes = this.resolveChildrenRoutes(
        controller.path!,
        controller.children,
        childMiddlewares
      );
      childRoutes = [...childRoutes, ...nestedRoutes];
    }

    return childRoutes;
  }

  private registerRoutes(
    hydrateRoute: Map<string, TokenRouteWithProvider[]>
  ): void {
    hydrateRoute.forEach((routes) => {
      routes.forEach((route) =>
        this.router.add(route.method.toLowerCase(), route.path, route)
      );
    });
  }
}
