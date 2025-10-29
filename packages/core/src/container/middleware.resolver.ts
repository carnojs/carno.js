import { InjectorService } from './InjectorService';
import { TokenRouteWithProvider } from './ContainerConfiguration';
import { CheetahMiddleware } from '../domain/CheetahMiddleware';
import { LocalsContainer } from '../domain/LocalsContainer';
import { Context } from '../domain/Context';

class MiddlewareResolver {
  public async resolveMiddlewares(route: TokenRouteWithProvider, injector: InjectorService, local: LocalsContainer) {
    if (route.middlewares.length == 0) {
      return;
    }

    await this.resolve(route.middlewares, injector, local)
  }

  private async resolve(middlewares: CheetahMiddleware[], injector: InjectorService, local: LocalsContainer) {
    const context = local.get(Context)
    let currentIndex = 0

    const next = async () => {
      if (currentIndex >= middlewares.length) {
        // Se já processamos todos os middlewares, não faz nada.
        // Isso evita o erro "Middleware stack exhausted" se um middleware chamar `next()`
        // quando não há mais middlewares.
        return;
      }

      const middleware = middlewares[currentIndex++]
      
      // @ts-ignore
      const instance = injector.invoke(middleware, local) as CheetahMiddleware
      
      // Await a execução do middleware.
      // Se o middleware lançar uma exceção, ela será propagada.
      await instance.handle(context, next)
    }

    if (middlewares.length === 0) return;

    // Inicia a execução dos middlewares
    await next()
  }
}

export const MiddlewareRes = new MiddlewareResolver();