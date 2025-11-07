import {describe, expect, test} from 'bun:test';
import {Cheetah, Controller, Get, Injectable} from '../src';
import {withCoreApplication, createCoreTestHarness} from '../src/testing';

describe('Core testing helper', () => {
  @Controller({path: '/health'})
  class HealthController {
    @Get()
    health() {
      return {status: 'ok'};
    }
  }

  @Controller({path: '/status'})
  class StatusController {
    @Get()
    status() {
      return 'ready';
    }
  }

  test('withCoreApplication initializes injector without server', async () => {
    await withCoreApplication(async ({app, injector, server, resolve}) => {
      const provider = injector.get(HealthController);
      const instance = resolve<HealthController>(HealthController);

      expect(app).toBeInstanceOf(Cheetah);
      expect(server).toBeUndefined();
      expect(provider?.token).toBe(HealthController);
      expect(instance).toBeInstanceOf(HealthController);
    }, {config: {providers: [HealthController]}});
  });

  test('withCoreApplication resolves controller dependencies', async () => {
    // Given: a service and a controller that depends on it
    @Injectable()
    class UserService {
      getUser() {
        return {id: 1, name: 'John Doe'};
      }
    }

    @Controller({path: '/users'})
    class UserController {
      constructor(private userService: UserService) {}

      @Get()
      get() {
        return this.userService.getUser();
      }
    }

    // When: withCoreApplication resolves the controller
    await withCoreApplication(async ({resolve}) => {
      const controller = resolve<UserController>(UserController);

      // Then: the service dependency should be injected
      expect(controller).toBeInstanceOf(UserController);
      expect(controller['userService']).toBeInstanceOf(UserService);
      
      const result = controller.get();
      expect(result).toEqual({id: 1, name: 'John Doe'});
    }, {config: {providers: [UserService, UserController]}});
  });

  test('withCoreApplication resolves controller dependencies via HTTP request', async () => {
    // Given: a service and a controller that depends on it
    @Injectable()
    class ProductService {
      getProduct() {
        return {id: 100, name: 'Laptop', price: 999.99};
      }
    }

    @Controller({path: '/products'})
    class ProductController {
      constructor(private productService: ProductService) {}

      @Get()
      get() {
        return this.productService.getProduct();
      }
    }

    // When: making an HTTP request to the controller endpoint
    await withCoreApplication(async ({request}) => {
      const response = await request('/products');
      const payload = await response.json();

      // Then: the service should be injected and return the correct data
      expect(response.status).toBe(200);
      expect(payload).toEqual({id: 100, name: 'Laptop', price: 999.99});
    }, {listen: true, config: {providers: [ProductService, ProductController]}});
  });

  test('withCoreApplication registers plugin providers', async () => {
    // Given: a plugin exporting a service
    @Injectable()
    class PluginService {
      getMessage() {
        return 'plugin-ready';
      }
    }

    const plugin = new Cheetah({exports: [PluginService]});

    // When: resolving the service through the harness with plugins
    await withCoreApplication(async ({resolve}) => {
      const service = resolve<PluginService>(PluginService);

      // Then: the service should come from the plugin exports
      expect(service).toBeInstanceOf(PluginService);
      expect(service.getMessage()).toBe('plugin-ready');
    }, {plugins: [plugin]});
  });

  test('withCoreApplication resolves imported service dependencies', async () => {
    // Given: services and controllers imported from external files
    const { TestService } = await import('./fixtures/test.service');
    const { TestController } = await import('./fixtures/test.controller');

    // When: making an HTTP request to the controller endpoint
    await withCoreApplication(async ({request}) => {
      const response = await request('/test');
      const payload = await response.json();

      // Then: the service should be injected and return the correct data
      expect(response.status).toBe(200);
      expect(payload).toEqual({message: 'Hello from TestService'});
    }, {listen: true, config: {providers: [TestService, TestController]}});
  });

  test('createCoreTestHarness performs http requests when listening', async () => {
    const harness = await createCoreTestHarness({
      listen: true,
      config: {providers: [StatusController]},
    });

    try {
      const response = await harness.request('/status');
      const payload = await response.text();

      expect(response.status).toBe(200);
      expect(payload).toBe('ready');
    } finally {
      await harness.close();
    }
  });
});
