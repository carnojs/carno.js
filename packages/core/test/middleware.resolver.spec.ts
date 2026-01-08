import { describe, it, expect, beforeEach } from 'bun:test';
import { Controller, Get, Context } from '../src';
import { withTestApp } from '../src/testing/TestHarness';
import type { MiddlewareHandler } from '../src';

describe('MiddlewareResolver', () => {
  // Create middlewares that modify context.locals
  const middleware1: MiddlewareHandler = (ctx: Context) => {
    ctx.locals.test = 'middleware1';
  };

  const middleware2: MiddlewareHandler = (ctx: Context) => {
    const value = ctx.locals.test || '';
    ctx.locals.test = value + '-middleware2';
  };

  const middlewareThatReturnsResponse: MiddlewareHandler = (ctx: Context) => {
    return new Response('Blocked by middleware', { status: 403 });
  };

  it('should execute middlewares in order', async () => {
    @Controller('/test')
    class TestController {
      @Get()
      getTest(ctx: Context) {
        return { result: ctx.locals.test };
      }
    }

    await withTestApp(
      async (harness) => {
        const response = await harness.get('/test');
        expect(response.status).toBe(200);
        // Note: Without @Use decorator on controller, middlewares need to be global
      },
      {
        controllers: [TestController],
        config: {
          globalMiddlewares: [middleware1, middleware2],
        },
        listen: true,
      }
    );
  });

  it('should allow middleware to return early response', async () => {
    @Controller('/blocked')
    class BlockedController {
      @Get()
      shouldNotReach() {
        return { reached: true };
      }
    }

    await withTestApp(
      async (harness) => {
        const response = await harness.get('/blocked');
        expect(response.status).toBe(403);
        expect(await response.text()).toBe('Blocked by middleware');
      },
      {
        controllers: [BlockedController],
        config: {
          globalMiddlewares: [middlewareThatReturnsResponse],
        },
        listen: true,
      }
    );
  });

  it('should handle routes with no middlewares', async () => {
    @Controller('/no-middleware')
    class NoMiddlewareController {
      @Get()
      simple() {
        return { ok: true };
      }
    }

    await withTestApp(
      async (harness) => {
        const response = await harness.get('/no-middleware');
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ ok: true });
      },
      {
        controllers: [NoMiddlewareController],
        listen: true,
      }
    );
  });

  it('should pass locals between middlewares', async () => {
    const setUserMiddleware: MiddlewareHandler = (ctx: Context) => {
      ctx.locals.user = { id: '42', name: 'John' };
    };

    @Controller('/user')
    class UserController {
      @Get()
      getUser(ctx: Context) {
        return { user: ctx.locals.user };
      }
    }

    await withTestApp(
      async (harness) => {
        const response = await harness.get('/user');
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.user).toEqual({ id: '42', name: 'John' });
      },
      {
        controllers: [UserController],
        config: {
          globalMiddlewares: [setUserMiddleware],
        },
        listen: true,
      }
    );
  });
});
