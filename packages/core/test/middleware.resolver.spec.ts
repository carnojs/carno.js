
import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { MiddlewareRes } from '../src/container/middleware.resolver';
import { InjectorService } from '../src/container/InjectorService';
import { LocalsContainer } from '../src/domain/LocalsContainer';
import { Context } from '../src/domain/Context';
import { CarnoMiddleware } from '../src/domain/CarnoMiddleware';
import { TokenRouteWithProvider } from '../src/container/ContainerConfiguration';

class MockInjector extends InjectorService {
  constructor() {
    // @ts-ignore
      super({} as any);
  }
  invoke(token: any, locals: LocalsContainer) {
    return new token();
  }
}

// @ts-ignore
class MockContext extends Context {
  constructor() {
    super();
    this.locals = {}; // Initialize locals as an empty object
  }
}

// Sample Middlewares for testing
const handle1 = mock(async (context: Context, next: () => Promise<void>) => {
  context.locals.test = 'middleware1';
  await next();
});
class Middleware1 implements CarnoMiddleware {
  handle = handle1;
}

const handle2 = mock(async (context: Context, next: () => Promise<void>) => {
  const value = context.locals.test;
  context.locals.test = value + '-middleware2';
  await next();
});
class Middleware2 implements CarnoMiddleware {
  handle = handle2;
}

const handleException = mock(async (context: Context, next: () => Promise<void>) => {
  throw new Error('Unauthorized');
});
class ExceptionMiddleware implements CarnoMiddleware {
  handle = handleException;
}

const handleLast = mock(async (context: Context, next: () => Promise<void>) => {
    context.locals.last = true;
    await next();
});
class LastMiddleware implements CarnoMiddleware {
    handle = handleLast;
}

describe('MiddlewareResolver', () => {
  beforeEach(() => {
    handle1.mockClear();
    handle2.mockClear();
    handleException.mockClear();
    handleLast.mockClear();
  })

  it('should execute middlewares in order', async () => {
    const injector = new MockInjector();
    const locals = new LocalsContainer();
    const context = new MockContext();
    locals.set(Context, context);

    const route: TokenRouteWithProvider = {
      middlewares: [Middleware1, Middleware2],
    } as any;

    await MiddlewareRes.resolveMiddlewares(route, injector, locals);

    expect(context.locals.test).toBe('middleware1-middleware2');
    expect(handle1).toHaveBeenCalledTimes(1);
    expect(handle2).toHaveBeenCalledTimes(1);
  });

  it('should propagate exceptions from a middleware', async () => {
    const injector = new MockInjector();
    const locals = new LocalsContainer();
    const context = new MockContext();
    locals.set(Context, context);

    const route: TokenRouteWithProvider = {
      middlewares: [Middleware1, ExceptionMiddleware, Middleware2],
    } as any;

    const promise = MiddlewareRes.resolveMiddlewares(route, injector, locals);

    await expect(promise).rejects.toThrow('Unauthorized');

    // Ensure Middleware1 was called, but Middleware2 was not
    expect(handle1).toHaveBeenCalledTimes(1);
    expect(handleException).toHaveBeenCalledTimes(1);
    expect(handle2).not.toHaveBeenCalled();
  });

  it('should handle routes with no middlewares', async () => {
    const injector = new MockInjector();
    const locals = new LocalsContainer();
    const context = new MockContext();
    locals.set(Context, context);

    const route: TokenRouteWithProvider = {
      middlewares: [],
    } as any;

    // This should not throw any error
    await MiddlewareRes.resolveMiddlewares(route, injector, locals);
  });

  it('should not throw "stack exhausted" if next() is called by the last middleware', async () => {
        const injector = new MockInjector();
        const locals = new LocalsContainer();
        const context = new MockContext();
        locals.set(Context, context);

        const route: TokenRouteWithProvider = {
            middlewares: [LastMiddleware],
        } as any;

        // This should resolve without throwing an error
        await MiddlewareRes.resolveMiddlewares(route, injector, locals);

        expect(context.locals.last).toBe(true);
    });
});
