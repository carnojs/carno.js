import { MIDDLEWARE_META, type MiddlewareInfo } from '../metadata';

/**
 * Middleware decorator.
 * Can be applied to controllers or individual methods.
 */
export function Use(...middlewares: Function[]): ClassDecorator & MethodDecorator {
    return function (target: any, propertyKey?: string) {
        const isMethod = propertyKey !== undefined;
        const metaTarget = isMethod ? target.constructor : target;
        const existing: MiddlewareInfo[] = Reflect.getMetadata(MIDDLEWARE_META, metaTarget) || [];

        for (const handler of middlewares) {
            existing.push({
                handler,
                target: isMethod ? propertyKey : undefined
            });
        }

        Reflect.defineMetadata(MIDDLEWARE_META, existing, metaTarget);
    } as ClassDecorator & MethodDecorator;
}
