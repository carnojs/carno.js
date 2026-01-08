import { ROUTES_META, type RouteInfo } from '../metadata';

/**
 * Marks a method as a GET route handler.
 */
export function Get(path: string = '') {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const routes: RouteInfo[] = Reflect.getMetadata(ROUTES_META, target.constructor) || [];

        routes.push({
            method: 'get',
            path: path.startsWith('/') ? path : '/' + path,
            handlerName: propertyKey
        });

        Reflect.defineMetadata(ROUTES_META, routes, target.constructor);
    };
}
