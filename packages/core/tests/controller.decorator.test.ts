import { describe, expect, it } from 'bun:test';
import 'reflect-metadata';


const CONTROLLER = "cheetah:controller";

type ProviderScope = 'SINGLETON' | 'REQUEST' | 'TRANSIENT';

type ControllerOptions = {
  path?: string,
  scope?: ProviderScope,
  children?: any[],
}

function normalizeOptions(pathOrOptions?: string | ControllerOptions): ControllerOptions {
  if (!pathOrOptions) {
    return {};
  }

  if (typeof pathOrOptions === 'string') {
    return { path: pathOrOptions };
  }

  return pathOrOptions;
}

function Controller(pathOrOptions?: string | ControllerOptions): ClassDecorator {
  return (target) => {
    const options = normalizeOptions(pathOrOptions);
    const controllers = Reflect.getMetadata(CONTROLLER, Reflect) || [];
    
    controllers.push({ provide: target, ...options });
    Reflect.defineMetadata(CONTROLLER, controllers, Reflect);
  };
}


describe('Controller Decorator - String and Object Syntax', () => {
  describe('when using string path syntax', () => {
    it('should register controller with path from string', () => {
      // Given: Clear previous metadata
      Reflect.defineMetadata(CONTROLLER, [], Reflect);
      
      // When: A class with @Controller decorator using string syntax
      @Controller('/users')
      class UserController {}

      const controllers = Reflect.getMetadata(CONTROLLER, Reflect);

      // Then: The controller should be registered with the correct path
      expect(controllers).toBeDefined();
      expect(controllers.length).toBe(1);
      expect(controllers[0].provide).toBe(UserController);
      expect(controllers[0].path).toBe('/users');
    });
  });

  describe('when using object options syntax', () => {
    it('should register controller with path from object', () => {
      // Given: Clear previous metadata
      Reflect.defineMetadata(CONTROLLER, [], Reflect);
      
      // When: A class with @Controller decorator using object syntax
      @Controller({ path: '/products' })
      class ProductController {}

      const controllers = Reflect.getMetadata(CONTROLLER, Reflect);

      // Then: The controller should be registered with the correct path
      expect(controllers).toBeDefined();
      expect(controllers.length).toBe(1);
      expect(controllers[0].provide).toBe(ProductController);
      expect(controllers[0].path).toBe('/products');
    });

    it('should register controller with all options', () => {
      // Given: Clear previous metadata
      Reflect.defineMetadata(CONTROLLER, [], Reflect);
      
      // When: A class with @Controller decorator using full options
      @Controller({
        path: '/orders',
        scope: 'REQUEST',
        children: [],
      })
      class OrderController {}

      const controllers = Reflect.getMetadata(CONTROLLER, Reflect);

      // Then: The controller should be registered with all options
      expect(controllers).toBeDefined();
      expect(controllers.length).toBe(1);
      expect(controllers[0].provide).toBe(OrderController);
      expect(controllers[0].path).toBe('/orders');
      expect(controllers[0].scope).toBe('REQUEST');
      expect(controllers[0].children).toEqual([]);
    });
  });

  describe('when using no arguments', () => {
    it('should register controller without options', () => {
      // Given: Clear previous metadata
      Reflect.defineMetadata(CONTROLLER, [], Reflect);
      
      // When: A class with @Controller decorator without arguments
      @Controller()
      class UserController {}

      const controllers = Reflect.getMetadata(CONTROLLER, Reflect);

      // Then: The controller should be registered without options
      expect(controllers).toBeDefined();
      expect(controllers.length).toBe(1);
      expect(controllers[0].provide).toBe(UserController);
      expect(controllers[0].path).toBeUndefined();
    });
  });
});
