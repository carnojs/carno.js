import { TokenRouteWithProvider, TokenRouteWithProviderMap } from "../container";
import { Context } from "../domain";

interface ParsedUrl {
  pathname: string;
}

function parseUrl(request: Request): ParsedUrl {
  const url = request.url;
  const startIndex = url.indexOf('/', 12);
  const queryIndex = url.indexOf('?', startIndex);

  if (queryIndex === -1) {
    return { pathname: startIndex === -1 ? '/' : url.slice(startIndex) };
  }

  return { pathname: url.slice(startIndex, queryIndex) };
}

class Matcher {

  match(
    request: Request,
    routes: TokenRouteWithProviderMap,
    context: Context
  ): TokenRouteWithProvider {
    const method = request.method.toLowerCase();

    if (!routes) {
      throw new Error(`Method not allowed for ${request.url}`);
    }

    const routeMethod = routes.get(method);
    const url = parseUrl(request);

    const route = routeMethod?.find(
      (route) => this.identifyRoute(route, url, context)
    );

    if (!route) {
      throw new Error('Method not allowed');
    }

    return route;
  }

  identifyRoute(
    route: TokenRouteWithProvider,
    url: ParsedUrl,
    context: Context
  ): boolean {
    const urlPath = url.pathname.split('/');
    const routePathSegments = route.path.split('/');

    if (urlPath.length !== routePathSegments.length) {
      return false;
    }

    return routePathSegments.every((path, index) => {
      if (path === '*') {
        return true;
      }

      if (path.startsWith(':')) {
        context.setParam({
          ...context.param,
          [path.replace(':', '')]: urlPath[index]
        });

        return true;
      }

      return path === urlPath[index];
    });
  }
}

export const RouteResolver = new Matcher();