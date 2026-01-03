import type { Context } from '../domain/Context';
import { isValidatable } from '../utils/ValidationCache';

export type ParamDecoratorType =
  | 'body'
  | 'query'
  | 'param'
  | 'headers'
  | 'req'
  | 'locals';

export interface ParamDecoratorMeta {
  fun: (context: Context, data?: any) => any;
  param?: any;
  type?: ParamDecoratorType;
}

export interface ParamInfo {
  type: ParamDecoratorType | 'di';
  key?: string;
  needsValidation: boolean;
  token?: any;
}

export function analyzeParamDecorator(
  decoratorMeta: ParamDecoratorMeta | undefined,
  token: any
): ParamInfo {
  if (!decoratorMeta) {
    return { type: 'di', needsValidation: false, token };
  }

  const paramType = resolveParamType(decoratorMeta);
  const key = decoratorMeta.param;
  const needsValidation =
    typeof token === 'function' && isValidatable(token);

  if (paramType) {
    return {
      type: paramType,
      key,
      needsValidation,
      token,
    };
  }

  return { type: 'di', needsValidation: false, token };
}

function resolveParamType(
  decoratorMeta: ParamDecoratorMeta
): ParamDecoratorType | null {
  if (decoratorMeta.type) {
    return decoratorMeta.type;
  }

  return inferTypeFromSource(decoratorMeta.fun);
}

function inferTypeFromSource(
  resolver: (context: Context, data?: any) => any
): ParamDecoratorType | null {
  const funcStr = resolver.toString();

  if (funcStr.includes('context.body')) {
    return 'body';
  }

  if (funcStr.includes('context.query')) {
    return 'query';
  }

  if (funcStr.includes('context.param')) {
    return 'param';
  }

  if (funcStr.includes('context.headers')) {
    return 'headers';
  }

  if (funcStr.includes('context.req')) {
    return 'req';
  }

  if (funcStr.includes('context.locals')) {
    return 'locals';
  }

  return null;
}
