import { plainToInstance } from 'class-transformer';
import { validateSync, type ValidatorOptions } from 'class-validator';

import type { TokenRouteWithProvider } from '../container/ContainerConfiguration';
import type { Container } from '../container/container';
import type { Provider } from '../domain/provider';
import { ProviderScope } from '../domain/provider-scope';
import type { Context } from '../domain/Context';
import { Metadata } from '../domain/Metadata';
import { HttpException } from '../exceptions/HttpException';
import { getMethodArgTypes } from '../utils/getMethodArgTypes';

import {
  type CompiledRoute,
  type ParamResolver,
  type AsyncParamResolver,
  RouteType,
} from './CompiledRoute';
import {
  analyzeParamDecorator,
  type ParamDecoratorMeta,
  type ParamInfo,
} from './ParamResolverFactory';
import { compileRouteHandler } from './JITCompiler';

export interface RouteCompilerOptions {
  container: Container;
  controllerScopes: Map<any, ProviderScope>;
  validationConfig?: ValidatorOptions;
  hasOnRequestHook: boolean;
  hasOnResponseHook: boolean;
}

export class RouteCompiler {
  private container: Container;

  private controllerScopes: Map<any, ProviderScope>;

  private validationConfig?: ValidatorOptions;

  private hasOnRequestHook: boolean;

  private hasOnResponseHook: boolean;

  constructor(options: RouteCompilerOptions) {
    this.container = options.container;
    this.controllerScopes = options.controllerScopes;
    this.validationConfig = options.validationConfig;
    this.hasOnRequestHook = options.hasOnRequestHook;
    this.hasOnResponseHook = options.hasOnResponseHook;
  }

  compile(route: TokenRouteWithProvider): CompiledRoute | null {
    if (!route || !route.provider) {
      return null;
    }

    const provider = this.container.get(route.provider);

    if (!provider) {
      return this.createFallbackRoute(route);
    }

    const scope = this.controllerScopes.get(provider.token);
    const isSingleton = scope === ProviderScope.SINGLETON;
    const instance = isSingleton ? provider.instance : null;

    if (!instance) {
      return this.createStandardRoute(route, provider);
    }

    const paramInfos = this.analyzeMethodParams(instance, route.methodName);
    const routeType = this.classifyRoute(route, paramInfos, isSingleton);

    if (routeType === RouteType.SIMPLE) {
      return this.createSimpleRoute(route, instance, paramInfos);
    }

    if (routeType === RouteType.STANDARD) {
      return this.createStandardRouteWithInstance(
        route,
        instance,
        paramInfos
      );
    }

    return this.createComplexRoute(route, paramInfos);
  }

  private classifyRoute(
    route: TokenRouteWithProvider,
    paramInfos: ParamInfo[],
    isSingleton: boolean
  ): RouteType {
    if (!isSingleton) {
      return RouteType.COMPLEX;
    }

    const hasMiddlewares = route.middlewares.length > 0;
    const hasDIParams = paramInfos.some((p) => p.type === 'di');
    const hasHooks = this.hasOnRequestHook || this.hasOnResponseHook;

    if (hasMiddlewares || hasDIParams || hasHooks) {
      return RouteType.STANDARD;
    }

    return RouteType.SIMPLE;
  }

  private analyzeMethodParams(
    instance: any,
    methodName: string
  ): ParamInfo[] {
    const argTypes = getMethodArgTypes(instance, methodName);
    const decoratorMetas = Metadata.getParamDecoratorFunc(
      instance,
      methodName
    ) as Record<number, ParamDecoratorMeta> | undefined;

    return argTypes.map((token: any, index: number) => {
      const meta = decoratorMetas?.[index];

      return analyzeParamDecorator(meta, token);
    });
  }

  private createSimpleRoute(
    route: TokenRouteWithProvider,
    instance: any,
    paramInfos: ParamInfo[]
  ): CompiledRoute {
    const hasValidation = paramInfos.some((p) => p.needsValidation);
    const validationIndices = paramInfos
      .map((p, i) => (p.needsValidation ? i : -1))
      .filter((i) => i >= 0);

    const hasBodyParam = paramInfos.some((p) => p.type === 'body');

    let boundHandler;

    if (hasValidation) {
      boundHandler = this.createValidatedHandler(
        instance,
        route.methodName,
        paramInfos,
        hasBodyParam
      );
    } else {
      boundHandler = compileRouteHandler(instance, route.methodName, paramInfos);
    }

    return {
      routeType: RouteType.SIMPLE,
      controllerInstance: instance,
      boundHandler,
      paramResolvers: [],
      needsLocalsContainer: false,
      hasMiddlewares: false,
      hasValidation,
      validationIndices,
      isAsync: hasBodyParam,
      original: route,
    };
  }

  private createStandardRouteWithInstance(
    route: TokenRouteWithProvider,
    instance: any,
    paramInfos: ParamInfo[]
  ): CompiledRoute {
    const hasValidation = paramInfos.some((p) => p.needsValidation);
    const validationIndices = paramInfos
      .map((p, i) => (p.needsValidation ? i : -1))
      .filter((i) => i >= 0);

    const hasDIParams = paramInfos.some((p) => p.type === 'di');
    const hasBodyParam = paramInfos.some((p) => p.type === 'body');
    const hasMiddlewares = route.middlewares.length > 0;
    const needsLocalsContainer = hasDIParams || hasMiddlewares;

    return {
      routeType: RouteType.STANDARD,
      controllerInstance: instance,
      boundHandler: null,
      paramResolvers: [],
      needsLocalsContainer,
      hasMiddlewares,
      hasValidation,
      validationIndices,
      isAsync: hasBodyParam || hasDIParams,
      original: route,
    };
  }

  private createStandardRoute(
    route: TokenRouteWithProvider,
    provider: Provider
  ): CompiledRoute {
    return {
      routeType: RouteType.STANDARD,
      controllerInstance: null,
      boundHandler: null,
      paramResolvers: [],
      needsLocalsContainer: true,
      hasMiddlewares: route.middlewares.length > 0,
      hasValidation: false,
      validationIndices: [],
      isAsync: true,
      original: route,
    };
  }

  private createComplexRoute(
    route: TokenRouteWithProvider,
    paramInfos: ParamInfo[]
  ): CompiledRoute {
    const hasValidation = paramInfos.some((p) => p.needsValidation);
    const validationIndices = paramInfos
      .map((p, i) => (p.needsValidation ? i : -1))
      .filter((i) => i >= 0);

    return {
      routeType: RouteType.COMPLEX,
      controllerInstance: null,
      boundHandler: null,
      paramResolvers: [],
      needsLocalsContainer: true,
      hasMiddlewares: route.middlewares.length > 0,
      hasValidation,
      validationIndices,
      isAsync: true,
      original: route,
    };
  }

  private createFallbackRoute(route: TokenRouteWithProvider): CompiledRoute {
    return {
      routeType: RouteType.COMPLEX,
      controllerInstance: null,
      boundHandler: null,
      paramResolvers: [],
      needsLocalsContainer: true,
      hasMiddlewares: route.middlewares.length > 0,
      hasValidation: false,
      validationIndices: [],
      isAsync: true,
      original: route,
    };
  }

  private createValidatedHandler(
    instance: any,
    methodName: string,
    paramInfos: ParamInfo[],
    hasBodyParam: boolean
  ): (context: Context) => any {
    const handler = instance[methodName].bind(instance);
    const config = this.validationConfig;

    const resolveArg = (ctx: Context, param: ParamInfo): any => {
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

      if (param.needsValidation && param.token) {
        const obj = plainToInstance(param.token, value);
        const errors = validateSync(obj, config);

        if (errors.length > 0) {
          throw new HttpException(errors, 400);
        }

        return obj;
      }

      return value;
    };

    if (hasBodyParam) {
      return async (ctx: Context) => {
        await ctx.getBody();

        const args = paramInfos.map((p) => resolveArg(ctx, p));

        return handler(...args);
      };
    }

    return (ctx: Context) => {
      const args = paramInfos.map((p) => resolveArg(ctx, p));

      return handler(...args);
    };
  }
}
