import type { Context } from '../domain/Context';
import type { TokenRouteWithProvider } from '../container/ContainerConfiguration';
import type { DirectHandler, FastSyncHandler } from './FastHandler';

export enum RouteType {
  SIMPLE = 0,
  STANDARD = 1,
  COMPLEX = 2,
}

export type ParamResolver = (context: Context) => any;

export type AsyncParamResolver = (context: Context) => Promise<any>;

export type CompiledHandler = (context: Context) => any;

export type AsyncCompiledHandler = (context: Context) => Promise<any>;

export interface CompiledRoute {
  routeType: RouteType;

  controllerInstance: any | null;

  boundHandler: CompiledHandler | AsyncCompiledHandler | null;

  /**
   * Ultra-fast handler for sync routes without context.
   * Called directly without creating Context object.
   */
  directHandler: DirectHandler | null;

  /**
   * Fast sync handler that receives request and params.
   * Used for routes with path parameters but no body/query.
   */
  fastHandler: FastSyncHandler | null;

  /**
   * Pre-created static Response for truly static handlers.
   * Used with Bun native routes for zero runtime overhead.
   */
  staticResponse: Response | null;

  /**
   * Static value for routes that return constant values.
   * Used to determine if route qualifies for staticResponse.
   */
  staticValue: string | object | null;

  paramResolvers: (ParamResolver | AsyncParamResolver | null)[];

  needsLocalsContainer: boolean;

  hasMiddlewares: boolean;

  hasValidation: boolean;

  validationIndices: number[];

  isAsync: boolean;

  original: TokenRouteWithProvider;
}
