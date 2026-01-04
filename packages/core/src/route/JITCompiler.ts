import type { Context } from '../domain/Context';
import type { ParamInfo } from './ParamResolverFactory';
import type { CompiledHandler, AsyncCompiledHandler } from './CompiledRoute';

const TEXT_HEADERS: Readonly<Record<string, string>> = Object.freeze({
  'Content-Type': 'text/html'
});

const JSON_HEADERS: Readonly<Record<string, string>> = Object.freeze({
  'Content-Type': 'application/json'
});

function isBodyInitResult(result: unknown): result is BodyInit {
  if (!result) {
    return false;
  }

  if (result instanceof ReadableStream) {
    return true;
  }

  if (result instanceof Blob || result instanceof ArrayBuffer) {
    return true;
  }

  if (ArrayBuffer.isView(result as ArrayBufferView)) {
    return true;
  }

  return result instanceof FormData || result instanceof URLSearchParams;
}


/**
 * Cria handler inline com response building integrado.
 * Usado quando não há parâmetros.
 */
function createInlineResponseHandler(
  handler: Function,
  isAsync: boolean
): CompiledHandler | AsyncCompiledHandler {
  if (isAsync) {
    return async (c: Context) => {
      const r = await handler();
      const s = c.getResponseStatus() || 200;
      if (typeof r === 'string') return new Response(r, { status: s, headers: TEXT_HEADERS });
      if (r instanceof Response) return r;
      if (r == null) return new Response('', { status: s, headers: TEXT_HEADERS });
      if (typeof r === 'number' || typeof r === 'boolean') {
        return new Response(String(r), { status: s, headers: TEXT_HEADERS });
      }
      if (isBodyInitResult(r)) {
        return new Response(r, { status: s });
      }
      return new Response(JSON.stringify(r), { status: s, headers: JSON_HEADERS });
    };
  }

  return (c: Context) => {
    const r = handler();
    const s = c.getResponseStatus() || 200;
    if (typeof r === 'string') return new Response(r, { status: s, headers: TEXT_HEADERS });
    if (r instanceof Response) return r;
    if (r == null) return new Response('', { status: s, headers: TEXT_HEADERS });
    if (typeof r === 'number' || typeof r === 'boolean') {
      return new Response(String(r), { status: s, headers: TEXT_HEADERS });
    }
    if (isBodyInitResult(r)) {
      return new Response(r, { status: s });
    }
    return new Response(JSON.stringify(r), { status: s, headers: JSON_HEADERS });
  };
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
 * Compila route handler em função otimizada.
 *
 * Estratégias de otimização:
 * - Inline de acesso a parâmetros
 * - Bind do handler no compile time
 * - Código gerado monomórfico
 * - Sem overhead de resolvers array
 */
/**
 * Compila route handler em função otimizada que retorna Response inline.
 *
 * Estratégias de otimização:
 * - Inline de acesso a parâmetros
 * - Inline de response building (elimina executeFastPath)
 * - Bind do handler no compile time
 * - Código gerado monomórfico
 * - Headers pré-frozen para otimização V8
 */
export function compileRouteHandler(
  instance: any,
  methodName: string,
  paramInfos: ParamInfo[]
): CompiledHandler | AsyncCompiledHandler {
  const handler = instance[methodName].bind(instance);

  if (paramInfos.length === 0) {
    return createInlineResponseHandler(handler, false);
  }

  const hasDIParam = paramInfos.some((p) => p.type === 'di');

  if (hasDIParam) {
    return createFallbackHandler(handler, paramInfos);
  }

  const hasBodyParam = paramInfos.some((p) => p.type === 'body');
  const argExpressions = paramInfos.map(buildArgExpression);
  const argsCode = argExpressions.join(',');

  if (hasBodyParam) {
    const code = `return async function(c){
await c.getBody();
const r=await h(${argsCode});
const s=c.getResponseStatus()||200;
if(typeof r==='string')return new Response(r,{status:s,headers:TH});
if(r instanceof Response)return r;
if(r==null)return new Response('',{status:s,headers:TH});
if(typeof r==='number'||typeof r==='boolean')return new Response(String(r),{status:s,headers:TH});
if(isBI(r))return new Response(r,{status:s});
return new Response(JSON.stringify(r),{status:s,headers:JH});
}`;

    return new Function('h', 'TH', 'JH', 'isBI', code)(
      handler,
      TEXT_HEADERS,
      JSON_HEADERS,
      isBodyInitResult
    );
  }

  const code = `return function(c){
const r=h(${argsCode});
const s=c.getResponseStatus()||200;
if(typeof r==='string')return new Response(r,{status:s,headers:TH});
if(r instanceof Response)return r;
if(r==null)return new Response('',{status:s,headers:TH});
if(typeof r==='number'||typeof r==='boolean')return new Response(String(r),{status:s,headers:TH});
if(isBI(r))return new Response(r,{status:s});
return new Response(JSON.stringify(r),{status:s,headers:JH});
}`;

  return new Function('h', 'TH', 'JH', 'isBI', code)(
    handler,
    TEXT_HEADERS,
    JSON_HEADERS,
    isBodyInitResult
  );
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
    const code = `return async function(c){\nawait c.getBody();\n${argAssignments}\nconst r=await h(${argList});\nconst s=c.getResponseStatus()||200;\nif(typeof r==='string')return new Response(r,{status:s,headers:TH});\nif(r instanceof Response)return r;\nif(r==null)return new Response('',{status:s,headers:TH});\nif(typeof r==='number'||typeof r==='boolean')return new Response(String(r),{status:s,headers:TH});\nif(isBI(r))return new Response(r,{status:s});\nreturn new Response(JSON.stringify(r),{status:s,headers:JH});\n}`;

    return new Function(
      'h',
      'va',
      ...tokenParams,
      'TH',
      'JH',
      'isBI',
      code
    )(
      handler,
      validatorAdapter,
      ...tokenValues,
      TEXT_HEADERS,
      JSON_HEADERS,
      isBodyInitResult
    );
  }

  const code = `return function(c){\n${argAssignments}\nconst r=h(${argList});\nconst s=c.getResponseStatus()||200;\nif(typeof r==='string')return new Response(r,{status:s,headers:TH});\nif(r instanceof Response)return r;\nif(r==null)return new Response('',{status:s,headers:TH});\nif(typeof r==='number'||typeof r==='boolean')return new Response(String(r),{status:s,headers:TH});\nif(isBI(r))return new Response(r,{status:s});\nreturn new Response(JSON.stringify(r),{status:s,headers:JH});\n}`;

  return new Function(
    'h',
    'va',
    ...tokenParams,
    'TH',
    'JH',
    'isBI',
    code
  )(
    handler,
    validatorAdapter,
    ...tokenValues,
    TEXT_HEADERS,
    JSON_HEADERS,
    isBodyInitResult
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

