import { describe, expect, it } from 'bun:test';

import { Context } from '../src/domain/Context';
import { compileRouteHandler } from '../src/route/JITCompiler';
import type { ParamInfo } from '../src/route/ParamResolverFactory';

describe('JITCompiler', () => {
  describe('compileRouteHandler', () => {
    it('should compile handler with no params', () => {
      // Given
      const controller = {
        ping() {
          return 'pong';
        },
      };

      // When
      const handler = compileRouteHandler(controller, 'ping', []);

      // Then
      const context = new Context();
      expect(handler(context)).toBe('pong');
    });

    it('should compile handler with param decorator', () => {
      // Given
      const controller = {
        getUser(id: string) {
          return `User: ${id}`;
        },
      };

      const paramInfos: ParamInfo[] = [
        { type: 'param', key: 'id', needsValidation: false },
      ];

      // When
      const handler = compileRouteHandler(controller, 'getUser', paramInfos);

      // Then
      const context = new Context();
      context.param = { id: '123' };
      expect(handler(context)).toBe('User: 123');
    });

    it('should compile handler with query decorator', () => {
      // Given
      const controller = {
        search(query: string, page: number) {
          return `${query} page ${page}`;
        },
      };

      const paramInfos: ParamInfo[] = [
        { type: 'query', key: 'q', needsValidation: false },
        { type: 'query', key: 'page', needsValidation: false },
      ];

      // When
      const handler = compileRouteHandler(controller, 'search', paramInfos);

      // Then
      const context = new Context();
      context.query = { q: 'test', page: 1 };
      expect(handler(context)).toBe('test page 1');
    });

    it('should compile handler with multiple decorator types', async () => {
      // Given
      const controller = {
        update(id: string, data: any) {
          return { id, data };
        },
      };

      const paramInfos: ParamInfo[] = [
        { type: 'param', key: 'id', needsValidation: false },
        { type: 'body', needsValidation: false },
      ];

      // When
      const handler = compileRouteHandler(controller, 'update', paramInfos);

      // Then
      const context = new Context();
      context.param = { id: '456' };
      context.body = { name: 'John' };
      // Mock getBody for now
      (context as any).getBody = async () => context.body;

      const result = await handler(context);
      expect(result).toEqual({ id: '456', data: { name: 'John' } });
    });

    it('should compile handler with headers decorator', () => {
      // Given
      const controller = {
        getAuth(token: string) {
          return `Token: ${token}`;
        },
      };

      const paramInfos: ParamInfo[] = [
        { type: 'headers', key: 'authorization', needsValidation: false },
      ];

      // When
      const handler = compileRouteHandler(controller, 'getAuth', paramInfos);

      // Then
      const context = new Context();
      context.headers = new Headers({ authorization: 'Bearer xyz' });
      expect(handler(context)).toBe('Token: Bearer xyz');
    });

    it('should compile handler with req decorator', () => {
      // Given
      const controller = {
        getRaw(req: Request) {
          return req.method;
        },
      };

      const paramInfos: ParamInfo[] = [
        { type: 'req', needsValidation: false },
      ];

      // When
      const handler = compileRouteHandler(controller, 'getRaw', paramInfos);

      // Then
      const context = new Context();
      context.req = new Request('http://localhost', { method: 'POST' });
      expect(handler(context)).toBe('POST');
    });

    it('should preserve this context', () => {
      // Given
      class Controller {
        prefix = 'Hello';

        greet(name: string) {
          return `${this.prefix}, ${name}`;
        }
      }

      const controller = new Controller();
      const paramInfos: ParamInfo[] = [
        { type: 'query', key: 'name', needsValidation: false },
      ];

      // When
      const handler = compileRouteHandler(controller, 'greet', paramInfos);

      // Then
      const context = new Context();
      context.query = { name: 'World' };
      expect(handler(context)).toBe('Hello, World');
    });

    it('should use fallback for DI params', () => {
      // Given
      const controller = {
        test(service: any) {
          return 'fallback';
        },
      };

      const paramInfos: ParamInfo[] = [
        { type: 'di', needsValidation: false, token: Object },
      ];

      // When
      const handler = compileRouteHandler(controller, 'test', paramInfos);

      // Then
      const context = new Context();
      expect(handler(context)).toBe('fallback');
    });
  });
});
