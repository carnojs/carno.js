import { Metadata } from "../../domain/Metadata";
import { TokenRoute } from "../../container/ContainerConfiguration";
import { CONTROLLER_ROUTES, ROUTE_PARAM } from "../../constants";
import { Context } from "../../domain/Context";

const PARAM_TYPE_KEY = "__carnoParamType";

type ParamType = "body" | "query" | "param" | "headers" | "req" | "locals";

const markParamType = (
  func: (context: Context, data?: any) => any,
  paramType: ParamType
) => {
  (func as any)[PARAM_TYPE_KEY] = paramType;

  return func;
};

const createMethodDecorator = (methodType: string) => {
  return (path: string = ""): MethodDecorator => {
    return (target, propertyKey) => {
      const routes: TokenRoute[] = [];
      if (!path.startsWith("/")) {
        path = `/${path}`;
      }

      if (Metadata.has(CONTROLLER_ROUTES, target)) {
        routes.push(...Metadata.get(CONTROLLER_ROUTES, target));
      }

      routes.push({
        method: methodType,
        path,
        methodName: propertyKey.toString(),
        middlewares: [],
      });
      Metadata.set(CONTROLLER_ROUTES, routes, target);
    };
  };
};

export function createParamDecorator(
  func: (context: Context, data?: any) => any
) {
  return (data?: any): ParameterDecorator =>
    (target, propertyKey, parameterIndex) => {
      const existingArgs: Record<number, any> =
        Metadata.get(ROUTE_PARAM, target.constructor, propertyKey) || {};
      existingArgs[parameterIndex] = {
        fun: func,
        param: data,
        type: (func as any)[PARAM_TYPE_KEY],
      };

      Metadata.set(ROUTE_PARAM, existingArgs, target.constructor, propertyKey);
    };
}

const bodyResolver = markParamType(
  (context: Context, data: string) =>
    data ? context.body[data] : context.body || {},
  "body"
);

const queryResolver = markParamType(
  (context: Context, data: string) =>
    data ? context.query[data] : context.query || {},
  "query"
);

const paramResolver = markParamType(
  (context: Context, data: string) =>
    data ? context.param[data] : null,
  "param"
);

const reqResolver = markParamType(
  (context: Context) => context.req,
  "req"
);

const headersResolver = markParamType(
  (context: Context, data: string) =>
    data
      ? context.headers.has(data)
        ? context.headers.get(data)
        : undefined
      : context.headers || {},
  "headers"
);

const localsResolver = markParamType(
  (context: Context) => context.locals || {},
  "locals"
);

export const Body = createParamDecorator(bodyResolver);
export const Query = createParamDecorator(queryResolver);
export const Param = createParamDecorator(paramResolver);
export const Req = createParamDecorator(reqResolver);
export const Headers = createParamDecorator(headersResolver);
export const Locals = createParamDecorator(localsResolver);
export const Get = createMethodDecorator("GET");
export const Post = createMethodDecorator("POST");
export const Put = createMethodDecorator("PUT");
export const Delete = createMethodDecorator("DELETE");
export const Patch = createMethodDecorator("PATCH");
