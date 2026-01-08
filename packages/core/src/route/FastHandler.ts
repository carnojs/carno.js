/**
 * Ultra-optimized handler templates for sync-only fast path.
 *
 * Pre-compiled function templates that avoid closures and
 * minimize allocations in the hot path.
 */

import {
  TEXT_200_OPTS,
  JSON_200_OPTS,
  buildResponse
} from './FastResponse';

export type DirectHandler = () => Response;

export type FastSyncHandler = (
  request: Request,
  params: Record<string, string>
) => Response;

export function createZeroParamTextHandler(
  handler: () => string
): DirectHandler {
  return () => new Response(handler(), TEXT_200_OPTS);
}

export function createZeroParamJsonHandler(
  handler: () => unknown
): DirectHandler {
  return () => Response.json(handler(), JSON_200_OPTS);
}

export function createZeroParamHandler(
  handler: () => unknown
): DirectHandler {
  return () => buildResponse(handler(), 200);
}

export function createOneParamTextHandler(
  handler: (p: string) => string,
  paramName: string
): FastSyncHandler {
  return (_, params) => new Response(handler(params[paramName]), TEXT_200_OPTS);
}

export function createOneParamJsonHandler(
  handler: (p: string) => unknown,
  paramName: string
): FastSyncHandler {
  return (_, params) => Response.json(handler(params[paramName]), JSON_200_OPTS);
}

export function createOneParamHandler(
  handler: (p: string) => unknown,
  paramName: string
): FastSyncHandler {
  return (_, params) => buildResponse(handler(params[paramName]), 200);
}

export function createTwoParamHandler(
  handler: (p1: string, p2: string) => unknown,
  param1: string,
  param2: string
): FastSyncHandler {
  return (_, params) => buildResponse(
    handler(params[param1], params[param2]),
    200
  );
}

export function createMultiParamHandler(
  handler: (...args: string[]) => unknown,
  paramNames: string[]
): FastSyncHandler {
  const len = paramNames.length;

  return (_, params) => {
    const args = new Array(len);

    for (let i = 0; i < len; i++) {
      args[i] = params[paramNames[i]];
    }

    return buildResponse(handler(...args), 200);
  };
}

export function wrapHandlerWithBuild(
  handler: (...args: any[]) => unknown
): (...args: any[]) => Response {
  return (...args) => buildResponse(handler(...args), 200);
}
