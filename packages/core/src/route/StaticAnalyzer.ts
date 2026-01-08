/**
 * Static analyzer for handler functions.
 *
 * Detects return types and patterns at compile time to select
 * the optimal handler strategy.
 */

export const enum ReturnType {
  STATIC_STRING = 0,
  STATIC_OBJECT = 1,
  DYNAMIC_STRING = 2,
  DYNAMIC_OBJECT = 3,
  DYNAMIC_UNKNOWN = 4
}

export interface HandlerAnalysis {
  returnType: ReturnType;
  staticValue?: string | object;
  isAsync: boolean;
  paramCount: number;
}

const ASYNC_PATTERN = /^async\s/;
const STATIC_STRING_PATTERN = /return\s+["'`]([^"'`]*)["'`]\s*[;\n}]/;
const STATIC_OBJECT_PATTERN = /return\s+(\{[^}]+\})\s*[;\n}]/;
const RETURN_STRING_PATTERN = /return\s+\w+/;

function extractStaticString(fnStr: string): string | null {
  const match = fnStr.match(STATIC_STRING_PATTERN);

  if (!match) return null;

  return match[1];
}

function extractStaticObject(fnStr: string): object | null {
  const match = fnStr.match(STATIC_OBJECT_PATTERN);

  if (!match) return null;

  try {
    return JSON.parse(
      match[1]
        .replace(/'/g, '"')
        .replace(/(\w+):/g, '"$1":')
    );
  } catch {
    return null;
  }
}

function countParams(fn: Function): number {
  return fn.length;
}

function detectAsync(fnStr: string): boolean {
  return ASYNC_PATTERN.test(fnStr);
}

export function analyzeHandler(fn: Function): HandlerAnalysis {
  const fnStr = fn.toString();
  const isAsync = detectAsync(fnStr);
  const paramCount = countParams(fn);

  if (isAsync) {
    return {
      returnType: ReturnType.DYNAMIC_UNKNOWN,
      isAsync: true,
      paramCount
    };
  }

  const staticString = extractStaticString(fnStr);

  if (staticString !== null) {
    return {
      returnType: ReturnType.STATIC_STRING,
      staticValue: staticString,
      isAsync: false,
      paramCount
    };
  }

  const staticObject = extractStaticObject(fnStr);

  if (staticObject !== null) {
    return {
      returnType: ReturnType.STATIC_OBJECT,
      staticValue: staticObject,
      isAsync: false,
      paramCount
    };
  }

  return {
    returnType: ReturnType.DYNAMIC_UNKNOWN,
    isAsync: false,
    paramCount
  };
}

export function canUseFastPath(analysis: HandlerAnalysis): boolean {
  return !analysis.isAsync;
}

export function isStaticReturn(analysis: HandlerAnalysis): boolean {
  const staticTypes = [ReturnType.STATIC_STRING, ReturnType.STATIC_OBJECT];

  return staticTypes.includes(analysis.returnType);
}
