import type { Context } from '../domain/Context';
import type { TokenRouteWithProvider } from '../container/ContainerConfiguration';

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

  paramResolvers: (ParamResolver | AsyncParamResolver | null)[];

  needsLocalsContainer: boolean;

  hasMiddlewares: boolean;

  hasValidation: boolean;

  validationIndices: number[];

  isAsync: boolean;

  original: TokenRouteWithProvider;
}
