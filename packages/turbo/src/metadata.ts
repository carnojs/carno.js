/**
 * Route metadata stored on controllers.
 */
export interface RouteInfo {
    method: 'get' | 'post' | 'put' | 'delete' | 'patch' | 'head' | 'options';
    path: string;
    handlerName: string;
}

/**
 * Middleware metadata.
 */
export interface MiddlewareInfo {
    handler: Function;
    target?: string;
}

/**
 * Metadata keys.
 */
export const CONTROLLER_META = Symbol('turbo:controller');
export const ROUTES_META = Symbol('turbo:routes');
export const PARAMS_META = Symbol('turbo:params');
export const MIDDLEWARE_META = Symbol('turbo:middleware');
export const SERVICE_META = Symbol('turbo:service');
export const INJECT_META = Symbol('turbo:inject');
