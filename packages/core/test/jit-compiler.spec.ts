import { describe, expect, it } from 'bun:test';

import { Context } from '../src/domain/Context';
import { compileRouteHandler } from '../src/route/JITCompiler';
import type { ParamInfo } from '../src/route/ParamResolverFactory';

describe('JITCompiler - Inline Response Building', () => {
  describe('compileRouteHandler', () => {
    it('should compile handler with no params and return Response', async () => {
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
      const response = handler(context);
      expect(response).toBeInstanceOf(Response);
      expect(await response.text()).toBe('pong');
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/html');
    });

    it('should compile handler with param decorator', async () => {
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
      const response = handler(context);
      expect(response).toBeInstanceOf(Response);
      expect(await response.text()).toBe('User: 123');
    });

    it('should compile handler with query decorator', async () => {
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
      const response = handler(context);
      expect(await response.text()).toBe('test page 1');
    });

    it('should compile handler returning JSON object', async () => {
      // Given
      const controller = {
        getData() {
          return { message: 'success', code: 42 };
        },
      };

      // When
      const handler = compileRouteHandler(controller, 'getData', []);

      // Then
      const context = new Context();
      const response = handler(context);
      expect(response).toBeInstanceOf(Response);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(await response.json()).toEqual({ message: 'success', code: 42 });
    });

    it('should compile handler with multiple decorator types and body', async () => {
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
      (context as any).getBody = async () => context.body;

      const response = await handler(context);
      expect(response).toBeInstanceOf(Response);
      expect(await response.json()).toEqual({ id: '456', data: { name: 'John' } });
    });

    it('should compile handler with headers decorator', async () => {
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
      context.req = new Request('http://localhost', {
        headers: { authorization: 'Bearer xyz' }
      });
      const response = handler(context);
      expect(await response.text()).toBe('Token: Bearer xyz');
    });

    it('should compile handler with req decorator', async () => {
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
      const response = handler(context);
      expect(await response.text()).toBe('POST');
    });

    it('should preserve this context', async () => {
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
      const response = handler(context);
      expect(await response.text()).toBe('Hello, World');
    });

    it('should handle null return value', async () => {
      // Given
      const controller = {
        empty() {
          return null;
        },
      };

      // When
      const handler = compileRouteHandler(controller, 'empty', []);

      // Then
      const context = new Context();
      const response = handler(context);
      expect(response).toBeInstanceOf(Response);
      expect(await response.text()).toBe('');
    });

    it('should handle custom Response return', async () => {
      // Given
      const customResponse = new Response('Custom', { status: 201 });
      const controller = {
        custom() {
          return customResponse;
        },
      };

      // When
      const handler = compileRouteHandler(controller, 'custom', []);

      // Then
      const context = new Context();
      const response = handler(context);
      expect(response).toBe(customResponse);
      expect(response.status).toBe(201);
    });

    it('should respect custom status from context', async () => {
      // Given
      const controller = {
        created() {
          return { created: true };
        },
      };

      // When
      const handler = compileRouteHandler(controller, 'created', []);

      // Then
      const context = new Context();
      context.setResponseStatus(201);
      const response = handler(context);
      expect(response.status).toBe(201);
    });
  });
});
