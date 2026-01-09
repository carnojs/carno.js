import { PARAMS_META } from '../metadata';

export type ParamType = 'param' | 'query' | 'body' | 'header' | 'req' | 'ctx' | 'locals';

export interface ParamMetadata {
    type: ParamType;
    key?: string;
    index: number;
}

function createParamDecorator(type: ParamType, key?: string) {
    return function (target: any, propertyKey: string, index: number) {
        const params: ParamMetadata[] = Reflect.getMetadata(PARAMS_META, target.constructor, propertyKey) || [];

        params.push({ type, key, index });

        Reflect.defineMetadata(PARAMS_META, params, target.constructor, propertyKey);
    };
}

export function Param(key?: string): ParameterDecorator {
    return createParamDecorator('param', key) as ParameterDecorator;
}

export function Query(key?: string): ParameterDecorator {
    return createParamDecorator('query', key) as ParameterDecorator;
}

export function Body(key?: string): ParameterDecorator {
    return createParamDecorator('body', key) as ParameterDecorator;
}

export function Header(key?: string): ParameterDecorator {
    return createParamDecorator('header', key) as ParameterDecorator;
}

export function Req(): ParameterDecorator {
    return createParamDecorator('req') as ParameterDecorator;
}

export function Ctx(): ParameterDecorator {
    return createParamDecorator('ctx') as ParameterDecorator;
}

export function Locals(key?: string): ParameterDecorator {
    return createParamDecorator('locals', key) as ParameterDecorator;
}
