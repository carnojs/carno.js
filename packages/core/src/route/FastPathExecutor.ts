import type { Context } from '../domain/Context';

import type { CompiledRoute } from './CompiledRoute';

export async function executeSimpleRoute(
  compiled: CompiledRoute,
  context: Context
): Promise<any> {
  if (!compiled.boundHandler) {
    throw new Error('Simple route must have a bound handler');
  }

  if (compiled.isAsync) {
    return compiled.boundHandler(context);
  }

  return compiled.boundHandler(context);
}

export function executeSimpleRouteSync(
  compiled: CompiledRoute,
  context: Context
): any {
  if (!compiled.boundHandler) {
    throw new Error('Simple route must have a bound handler');
  }

  return compiled.boundHandler(context);
}
