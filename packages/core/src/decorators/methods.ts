import { ROUTES_META, type RouteInfo } from '../metadata';

type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'head' | 'options';

/**
 * Creates a method decorator for HTTP methods.
 * Supports both legacy decorators (experimentalDecorators) and TS5 stage 3 decorators.
 */
function createMethodDecorator(method: HttpMethod) {
    return function (path: string = ''): any {
        return function (
            targetOrMethod: any,
            contextOrPropertyKey?: string | symbol | ClassMethodDecoratorContext,
            descriptor?: PropertyDescriptor
        ): any {
            // TS5 Stage 3 decorators: context is ClassMethodDecoratorContext
            if (contextOrPropertyKey && typeof contextOrPropertyKey === 'object' && 'kind' in contextOrPropertyKey) {
                const context = contextOrPropertyKey as ClassMethodDecoratorContext;

                context.addInitializer(function (this: any) {
                    const constructor = this.constructor;
                    const routes: RouteInfo[] = Reflect.getMetadata(ROUTES_META, constructor) || [];

                    routes.push({
                        method,
                        path: path.startsWith('/') ? path : '/' + path,
                        handlerName: String(context.name)
                    });

                    Reflect.defineMetadata(ROUTES_META, routes, constructor);
                });

                return targetOrMethod;
            }

            // Legacy decorators (experimentalDecorators: true)
            const constructor = targetOrMethod.constructor;
            const propertyKey = contextOrPropertyKey as string | symbol;
            const routes: RouteInfo[] = Reflect.getMetadata(ROUTES_META, constructor) || [];

            routes.push({
                method,
                path: path.startsWith('/') ? path : '/' + path,
                handlerName: String(propertyKey)
            });

            Reflect.defineMetadata(ROUTES_META, routes, constructor);
        };
    };
}

export const Get = createMethodDecorator('get');
export const Post = createMethodDecorator('post');
export const Put = createMethodDecorator('put');
export const Delete = createMethodDecorator('delete');
export const Patch = createMethodDecorator('patch');
export const Head = createMethodDecorator('head');
export const Options = createMethodDecorator('options');
