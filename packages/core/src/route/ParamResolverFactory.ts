import { plainToInstance } from 'class-transformer';
import { validateSync, type ValidatorOptions } from 'class-validator';

import type { Context } from '../domain/Context';
import { HttpException } from '../exceptions/HttpException';
import { isValidatable } from '../utils/ValidationCache';

import type { ParamResolver, AsyncParamResolver } from './CompiledRoute';

export interface ParamDecoratorMeta {
  fun: (context: Context, data?: any) => any;
  param?: any;
}

export interface ParamInfo {
  type: 'body' | 'query' | 'param' | 'headers' | 'req' | 'locals' | 'di';
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

  const funcStr = decoratorMeta.fun.toString();
  const key = decoratorMeta.param;
  const needsValidation =
    typeof token === 'function' && isValidatable(token);

  if (funcStr.includes('context.body')) {
    return { type: 'body', key, needsValidation, token };
  }

  if (funcStr.includes('context.query')) {
    return { type: 'query', key, needsValidation, token };
  }

  if (funcStr.includes('context.param')) {
    return { type: 'param', key, needsValidation, token };
  }

  if (funcStr.includes('context.headers')) {
    return { type: 'headers', key, needsValidation, token };
  }

  if (funcStr.includes('context.req')) {
    return { type: 'req', needsValidation: false, token };
  }

  if (funcStr.includes('context.locals')) {
    return { type: 'locals', needsValidation: false, token };
  }

  return { type: 'di', needsValidation: false, token };
}

function createValidationResolver(
  extractFn: (context: Context) => any,
  token: any,
  validationConfig?: ValidatorOptions
): ParamResolver {
  return (context: Context) => {
    const value = extractFn(context);
    const obj = plainToInstance(token, value);
    const errors = validateSync(obj, validationConfig);

    if (errors.length > 0) {
      throw new HttpException(errors, 400);
    }

    return obj;
  };
}

export function createParamResolver(
  decoratorMeta: ParamDecoratorMeta | undefined,
  token: any,
  validationConfig?: ValidatorOptions
): ParamResolver | AsyncParamResolver | null {
  if (!decoratorMeta) {
    return null;
  }

  const extractFn = (context: Context) =>
    decoratorMeta.fun(context, decoratorMeta.param);

  const needsValidation =
    typeof token === 'function' && isValidatable(token);

  if (needsValidation) {
    return createValidationResolver(extractFn, token, validationConfig);
  }

  return extractFn;
}

export function createParamResolvers(
  paramMetas: Record<number, ParamDecoratorMeta> | undefined,
  argTypes: any[],
  validationConfig?: ValidatorOptions
): (ParamResolver | AsyncParamResolver | null)[] {
  const resolvers: (ParamResolver | AsyncParamResolver | null)[] = [];

  for (let i = 0; i < argTypes.length; i++) {
    const meta = paramMetas?.[i];
    const token = argTypes[i];
    resolvers.push(createParamResolver(meta, token, validationConfig));
  }

  return resolvers;
}

export function hasAnyDIParam(
  resolvers: (ParamResolver | AsyncParamResolver | null)[]
): boolean {
  return resolvers.some((r) => r === null);
}
