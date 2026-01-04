import { InjectorService } from './InjectorService';
import { TokenRouteWithProvider } from './ContainerConfiguration';
import { CarnoMiddleware } from '../domain/CarnoMiddleware';
import { LocalsContainer } from '../domain/LocalsContainer';
import { Context } from '../domain/Context';

class MiddlewareResolver {
  public async resolveMiddlewares(route: TokenRouteWithProvider, injector: InjectorService, local: LocalsContainer) {
    if (route.middlewares.length == 0) {
      return;
    }

    await this.resolve(route.middlewares, injector, local)
  }

  private async resolve(middlewares: CarnoMiddleware[], injector: InjectorService, local: LocalsContainer) {
    const context = local.get(Context)
    let currentIndex = 0

    const next = async () => {
      if (currentIndex >= middlewares.length) {
        // If all middlewares are already processed, do nothing.
        // This avoids "Middleware stack exhausted" if a middleware calls `next()`
        // when there are no more middlewares.
        return;
      }

      const middleware = middlewares[currentIndex++]
      
      // @ts-ignore
      const instance = injector.invoke(middleware, local) as CarnoMiddleware
      
      // Await the middleware execution.
      // If the middleware throws, the exception will propagate.
      await instance.handle(context, next)
    }

    if (middlewares.length === 0) return;

    // Start the middleware execution
    await next()
  }
}

export const MiddlewareRes = new MiddlewareResolver();
