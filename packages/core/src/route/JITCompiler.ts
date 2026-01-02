import type { Context } from '../domain/Context';
import type { ParamInfo } from './ParamResolverFactory';
import type { CompiledHandler, AsyncCompiledHandler } from './CompiledRoute';

function escapeKey(key: string): string {
  return key.replace(/['"\\]/g, '\\$&');
}

function buildArgExpression(param: ParamInfo, index: number): string {
  const key = param.key ? escapeKey(param.key) : undefined;

  switch (param.type) {
    case 'param':
      return key ? `ctx.param['${key}']` : 'ctx.param';

    case 'query':
      return key ? `ctx.query['${key}']` : 'ctx.query';

    case 'body':
      return key ? `ctx.body['${key}']` : 'ctx.body';

    case 'headers':
      return key
        ? `ctx.headers.get('${key}')`
        : 'ctx.headers';

    case 'req':
      return 'ctx.req';

    case 'locals':
      return 'ctx.locals';

    case 'di':
      return `resolvers[${index}](ctx)`;

    default:
      return `resolvers[${index}](ctx)`;
  }
}

export function compileRouteHandler(
  instance: any,
  methodName: string,
  paramInfos: ParamInfo[]
): CompiledHandler | AsyncCompiledHandler {
  const handler = instance[methodName].bind(instance);

  if (paramInfos.length === 0) {
    return () => handler();
  }

  const hasBodyParam = paramInfos.some((p) => p.type === 'body');
  const hasDIParam = paramInfos.some((p) => p.type === 'di');

  if (hasDIParam) {
    return createFallbackHandler(handler, paramInfos);
  }

  const argExpressions = paramInfos.map(buildArgExpression);

  if (hasBodyParam) {
    return createAsyncHandler(handler, argExpressions);
  }

  return createSyncHandler(handler, argExpressions);
}

function createSyncHandler(
  handler: Function,
  argExpressions: string[]
): CompiledHandler {
  const code = `
    return function compiledHandler(ctx) {
      return handler(${argExpressions.join(', ')});
    }
  `;

  return new Function('handler', code)(handler);
}

function createAsyncHandler(
  handler: Function,
  argExpressions: string[]
): AsyncCompiledHandler {
  const code = `
    return async function compiledHandler(ctx) {
      await ctx.getBody();
      return handler(${argExpressions.join(', ')});
    }
  `;

  return new Function('handler', code)(handler);
}

function createFallbackHandler(
  handler: Function,
  paramInfos: ParamInfo[]
): CompiledHandler {
  return (ctx: Context) => {
    const args: any[] = [];

    for (const param of paramInfos) {
      switch (param.type) {
        case 'param':
          args.push(param.key ? ctx.param[param.key] : ctx.param);
          break;

        case 'query':
          args.push(param.key ? ctx.query[param.key] : ctx.query);
          break;

        case 'body':
          args.push(param.key ? ctx.body[param.key] : ctx.body);
          break;

        case 'headers':
          args.push(
            param.key ? ctx.headers.get(param.key) : ctx.headers
          );
          break;

        case 'req':
          args.push(ctx.req);
          break;

        case 'locals':
          args.push(ctx.locals);
          break;

        default:
          args.push(undefined);
          break;
      }
    }

    return handler(...args);
  };
}

export function compileValidatedHandler(
  instance: any,
  methodName: string,
  paramInfos: ParamInfo[],
  validators: ((value: any) => any)[]
): CompiledHandler | AsyncCompiledHandler {
  const handler = instance[methodName].bind(instance);
  const hasBodyParam = paramInfos.some((p) => p.type === 'body');

  const resolveArg = (ctx: Context, param: ParamInfo, index: number): any => {
    let value: any;

    switch (param.type) {
      case 'param':
        value = param.key ? ctx.param[param.key] : ctx.param;
        break;

      case 'query':
        value = param.key ? ctx.query[param.key] : ctx.query;
        break;

      case 'body':
        value = param.key ? ctx.body[param.key] : ctx.body;
        break;

      case 'headers':
        value = param.key ? ctx.headers.get(param.key) : ctx.headers;
        break;

      case 'req':
        value = ctx.req;
        break;

      case 'locals':
        value = ctx.locals;
        break;

      default:
        value = undefined;
    }

    if (param.needsValidation && validators[index]) {
      return validators[index](value);
    }

    return value;
  };

  if (hasBodyParam) {
    return async (ctx: Context) => {
      await ctx.getBody();

      const args = paramInfos.map((p, i) => resolveArg(ctx, p, i));

      return handler(...args);
    };
  }

  return (ctx: Context) => {
    const args = paramInfos.map((p, i) => resolveArg(ctx, p, i));

    return handler(...args);
  };
}
