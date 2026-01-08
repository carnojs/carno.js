/**
 * JIT Compiler for Turbo.
 * 
 * Aggressive AOT optimizations:
 * - Detects async at compile time (not runtime)
 * - Generates specialized handlers via new Function()
 * - Inlines parameter access
 * - Zero overhead for simple handlers
 */

import type { ParamType } from '../decorators/params';

export interface ParamInfo {
    type: ParamType;
    key?: string;
    index: number;
}

export interface CompiledHandler {
    fn: Function;
    isAsync: boolean;
    isStatic: boolean;
    staticValue?: any;
}

const ASYNC_REGEX = /^async\s|^\([^)]*\)\s*=>\s*\{[\s\S]*await\s|^function\s*\*|\.then\s*\(/;

/**
 * Detects if function is async at compile time.
 * Checks: async keyword, await usage, generators, .then()
 */
export function isAsyncFunction(fn: Function): boolean {
    if (fn.constructor.name === 'AsyncFunction') {
        return true;
    }

    const source = fn.toString();

    return ASYNC_REGEX.test(source);
}

/**
 * Detects if handler returns a static value.
 * Static handlers can be pre-computed at startup.
 */
export function isStaticHandler(fn: Function): boolean {
    const source = fn.toString();

    if (source.includes('this.') || source.includes('await')) {
        return false;
    }

    const returnMatch = source.match(/=>\s*["'`]|return\s+["'`]|=>\s*\{|=>\s*\d/);

    return !!returnMatch;
}

/**
 * Compiles handler with inlined parameter access.
 * Uses new Function() for maximum V8 optimization.
 */
export function compileHandler(
    instance: any,
    methodName: string,
    params: ParamInfo[]
): CompiledHandler {
    const method = instance[methodName];
    const bound = method.bind(instance);
    const async = isAsyncFunction(method);

    if (params.length === 0) {
        const isStatic = isStaticHandler(method);

        if (isStatic && !async) {
            const staticValue = bound();

            return {
                fn: bound,
                isAsync: false,
                isStatic: true,
                staticValue
            };
        }

        return {
            fn: bound,
            isAsync: async,
            isStatic: false
        };
    }

    const argExprs = params
        .sort((a, b) => a.index - b.index)
        .map(p => buildArgExpression(p));

    const argsCode = argExprs.join(',');
    const hasBody = params.some(p => p.type === 'body');

    if (hasBody) {
        const code = `return async function(c){
await c.parseBody();
return h(${argsCode});
}`;

        return {
            fn: new Function('h', code)(bound),
            isAsync: true,
            isStatic: false
        };
    }

    if (async) {
        const code = `return async function(c){
return await h(${argsCode});
}`;

        return {
            fn: new Function('h', code)(bound),
            isAsync: true,
            isStatic: false
        };
    }

    const code = `return function(c){
return h(${argsCode});
}`;

    return {
        fn: new Function('h', code)(bound),
        isAsync: false,
        isStatic: false
    };
}

function escapeKey(key: string): string {
    return key.replace(/['\"\\]/g, '\\$&');
}

function buildArgExpression(param: ParamInfo): string {
    const key = param.key ? escapeKey(param.key) : undefined;

    switch (param.type) {
        case 'param':
            return key ? `c.params['${key}']` : 'c.params';

        case 'query':
            return key ? `c.query['${key}']` : 'c.query';

        case 'body':
            return key ? `c.body['${key}']` : 'c.body';

        case 'header':
            return key ? `c.req.headers.get('${key}')` : 'c.req.headers';

        case 'req':
            return 'c.req';

        case 'ctx':
            return 'c';

        default:
            return 'undefined';
    }
}
