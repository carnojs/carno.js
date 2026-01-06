import type { Context } from '../domain/Context';
import type { ParamInfo } from './ParamResolverFactory';
import type { CompiledHandler, AsyncCompiledHandler } from './CompiledRoute';

/**
 * Pre-frozen headers for V8 hidden class optimization.
 * These are reused across all responses to avoid allocation.
 */
const TEXT_HEADERS: Readonly<Record<string, string>> = Object.freeze({
  'Content-Type': 'text/html'
});

const JSON_HEADERS: Readonly<Record<string, string>> = Object.freeze({
  'Content-Type': 'application/json'
});

/**
 * Pre-allocated empty Response bodies for common cases.
 * Avoids string allocation in hot path.
 */
const EMPTY_STRING = '';

/**
 * Type check cache for Response detection.
 * Uses typeof + instanceof combo for V8 inline cache optimization.
 */
const isResponse = (r: unknown): r is Response => r instanceof Response;

/**
 * Ultra-fast BodyInit detection using prototype chain.
 * Ordered by frequency in typical web apps.
 */
function isBodyInitResult(result: unknown): result is BodyInit {
  if (!result) return false;

  // Most common first
  if (result instanceof ReadableStream) return true;
  if (result instanceof Blob) return true;
  if (result instanceof ArrayBuffer) return true;
  if (ArrayBuffer.isView(result as ArrayBufferView)) return true;
  if (result instanceof FormData) return true;
  if (result instanceof URLSearchParams) return true;

  return false;
}

/**
 * Ultra-optimized response builder.
 * Single function with minimal branching for V8 optimization.
 * Status is passed directly to avoid getter call.
 */
function buildResponse(r: unknown, status: number): Response {
  // Fast path: string (most common for simple routes)
  if (typeof r === 'string') {
    return new Response(r, { status, headers: TEXT_HEADERS });
  }

  // Already a Response - return as-is
  if (r instanceof Response) return r;

  // Null/undefined
  if (r == null) {
    return new Response(EMPTY_STRING, { status, headers: TEXT_HEADERS });
  }

  // Primitives
  const t = typeof r;
  if (t === 'number' || t === 'boolean') {
    return new Response(String(r), { status, headers: TEXT_HEADERS });
  }

  // BodyInit types
  if (isBodyInitResult(r)) {
    return new Response(r, { status });
  }

  // Object - JSON serialize
  return new Response(JSON.stringify(r), { status, headers: JSON_HEADERS });
}

/**
 * Async version of response builder.
 */
async function buildResponseAsync(r: Promise<unknown>, status: number): Promise<Response> {
  return buildResponse(await r, status);
}


/**
 * Creates ultra-optimized inline handler for zero-param routes.
 * These are the fastest possible handlers.
 */
function createInlineResponseHandler(
  handler: Function,
  isAsync: boolean
): CompiledHandler | AsyncCompiledHandler {
  if (isAsync) {
    // Async handler - minimal wrapper
    return async (c: Context) => {
      const r = await handler();
      return buildResponse(r, c.status || 200);
    };
  }

  // Sync handler - zero overhead
  return (c: Context) => buildResponse(handler(), c.status || 200);
}

function escapeKey(key: string): string {
  return key.replace(/['\"\\]/g, '\\$&');
}

/**
 * Gera expressão de acesso a parâmetro inline.
 * Otimizado para evitar chamadas de função quando possível.
 */
function buildArgExpression(param: ParamInfo): string {
  const key = param.key ? escapeKey(param.key) : undefined;

  switch (param.type) {
    case 'param':
      return key ? `c.param['${key}']` : 'c.param';

    case 'query':
      return key ? `c.query['${key}']` : 'c.query';

    case 'body':
      return key ? `c.body['${key}']` : 'c.body';

    case 'headers':
      return key ? `c.headers.get('${key}')` : 'c.headers';

    case 'req':
      return 'c.req';

    case 'locals':
      return 'c.locals';

    default:
      return 'undefined';
  }
}

/**
 * Compila route handler em função ultra-otimizada.
 *
 * Estratégias de otimização:
 * - Inline de acesso a parâmetros via code generation
 * - buildResponse centralizado para V8 inlining
 * - Bind do handler no compile time
 * - Código gerado monomórfico
 * - Sem overhead de resolvers array
 * - Status direto via c.status (não getter)
 */
export function compileRouteHandler(
  instance: any,
  methodName: string,
  paramInfos: ParamInfo[]
): CompiledHandler | AsyncCompiledHandler {
  const handler = instance[methodName].bind(instance);

  // Zero params - use ultra-fast inline handler
  if (paramInfos.length === 0) {
    return createInlineResponseHandler(handler, false);
  }

  // Check for DI params - fallback path
  const hasDIParam = paramInfos.some((p) => p.type === 'di');
  if (hasDIParam) {
    return createFallbackHandler(handler, paramInfos);
  }

  const hasBodyParam = paramInfos.some((p) => p.type === 'body');
  const argExpressions = paramInfos.map(buildArgExpression);
  const argsCode = argExpressions.join(',');

  if (hasBodyParam) {
    // Async body handler with buildResponse
    const code = `return async function(c){
await c.getBody();
const r=await h(${argsCode});
return br(r,c.status||200);
}`;

    return new Function('h', 'br', code)(handler, buildResponse);
  }

  // Sync handler with buildResponse
  const code = `return function(c){
const r=h(${argsCode});
return br(r,c.status||200);
}`;

  return new Function('h', 'br', code)(handler, buildResponse);
}

/**
 * Handler fallback para casos com DI.
 */
function createFallbackHandler(
  handler: Function,
  paramInfos: ParamInfo[]
): CompiledHandler {
  return (ctx: Context) => {
    const args = resolveArgs(paramInfos, ctx);

    return handler(...args);
  };
}

/**
 * Resolve argumentos para fallback handler.
 */
function resolveArgs(paramInfos: ParamInfo[], ctx: Context): any[] {
  const args: any[] = new Array(paramInfos.length);
  let i = 0;

  for (const param of paramInfos) {
    args[i++] = resolveArg(param, ctx);
  }

  return args;
}

/**
 * Resolve um argumento individual.
 */
function resolveArg(param: ParamInfo, ctx: Context): any {
  switch (param.type) {
    case 'param':
      return param.key ? ctx.param[param.key] : ctx.param;

    case 'query':
      return param.key ? ctx.query[param.key] : ctx.query;

    case 'body':
      return param.key ? ctx.body[param.key] : ctx.body;

    case 'headers':
      return param.key ? ctx.headers.get(param.key) : ctx.headers;

    case 'req':
      return ctx.req;

    case 'locals':
      return ctx.locals;

    default:
      return undefined;
  }
}

/**
 * Compila handler com validação inline.
 * Uses centralized buildResponse for consistency.
 */
export function compileValidatedHandler(
  instance: any,
  methodName: string,
  paramInfos: ParamInfo[],
  validatorAdapter: { validateAndTransform: (token: any, value: any) => any }
): CompiledHandler | AsyncCompiledHandler {
  const handler = instance[methodName].bind(instance);
  const hasBodyParam = paramInfos.some((p) => p.type === 'body');

  if (paramInfos.length === 0) {
    return createInlineResponseHandler(handler, false);
  }

  const {
    argAssignments,
    argList,
    tokenParams,
    tokenValues,
  } = buildValidatedArgs(paramInfos);

  if (hasBodyParam) {
    const code = `return async function(c){\nawait c.getBody();\n${argAssignments}\nconst r=await h(${argList});\nreturn br(r,c.status||200);\n}`;

    return new Function(
      'h',
      'va',
      ...tokenParams,
      'br',
      code
    )(
      handler,
      validatorAdapter,
      ...tokenValues,
      buildResponse
    );
  }

  const code = `return function(c){\n${argAssignments}\nconst r=h(${argList});\nreturn br(r,c.status||200);\n}`;

  return new Function(
    'h',
    'va',
    ...tokenParams,
    'br',
    code
  )(
    handler,
    validatorAdapter,
    ...tokenValues,
    buildResponse
  );
}

function buildValidatedArgs(paramInfos: ParamInfo[]): {
  argAssignments: string;
  argList: string;
  tokenParams: string[];
  tokenValues: any[];
} {
  const assignments: string[] = [];
  const args: string[] = [];
  const tokenParams: string[] = [];
  const tokenValues: any[] = [];

  let index = 0;

  for (const param of paramInfos) {
    const argName = `a${index}`;
    const argExpr = buildArgExpression(param);
    const tokenName = getTokenParamName(param, index, tokenParams, tokenValues);
    const valueExpr = buildValidatedExpression(argExpr, tokenName);

    assignments.push(`const ${argName}=${valueExpr};`);
    args.push(argName);
    index += 1;
  }

  return {
    argAssignments: assignments.join('\n'),
    argList: args.join(','),
    tokenParams,
    tokenValues,
  };
}

function buildValidatedExpression(
  argExpr: string,
  tokenName: string | null
): string {
  if (!tokenName) {
    return argExpr;
  }

  return `va.validateAndTransform(${tokenName}, ${argExpr})`;
}

function getTokenParamName(
  param: ParamInfo,
  index: number,
  tokenParams: string[],
  tokenValues: any[]
): string | null {
  if (!param.needsValidation || !param.token) {
    return null;
  }

  const tokenName = `t${index}`;

  tokenParams.push(tokenName);
  tokenValues.push(param.token);

  return tokenName;
}

