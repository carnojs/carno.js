import { ApplicationConfig } from "../Carno";
import { TokenProvider } from "../commons/registries/ProviderControl";
import { Context } from "../domain/Context";
import { LocalsContainer } from "../domain/LocalsContainer";
import { Metadata } from "../domain/Metadata";
import { getClassOrSymbol } from "../utils/getClassOrSymbol";
import { getMethodArgTypes } from "../utils/getMethodArgTypes";
import type { ValidatorAdapter } from "../validation/ValidatorAdapter";

type MethodCache = {
  args: any;
  params: any;
  needsBody: boolean;
};

export class MethodInvoker {
  private historyMethods: WeakMap<any, { [key: string]: MethodCache }> =
    new WeakMap();

  constructor(
    private applicationConfig: ApplicationConfig,
    private validatorAdapter: ValidatorAdapter
  ) {}

  async invoke(
    instance: any,
    methodName: string,
    locals: LocalsContainer,
    context: Context,
    invokeCallback: (token: TokenProvider, locals: LocalsContainer) => any
  ): Promise<any> {
    const methodInfo = this.getMethodInfo(instance, methodName);

    await this.ensureBodyParsed(methodInfo, context);

    const services = this.resolveMethodServices(
      methodInfo,
      context,
      locals,
      invokeCallback
    );

    return instance[methodName](...services);
  }

  private getMethodInfo(instance: any, methodName: string): MethodCache {
    const cached = this.getCachedMethod(instance, methodName);
    return cached || this.cacheMethodInfo(instance, methodName);
  }

  private getCachedMethod(
    instance: any,
    methodName: string
  ): MethodCache | undefined {
    const cachedMethod = this.historyMethods.get(instance);
    return cachedMethod?.[methodName];
  }

  private cacheMethodInfo(instance: any, methodName: string): MethodCache {
    const args = getMethodArgTypes(instance, methodName);
    const params = Metadata.getParamDecoratorFunc(instance, methodName);
    const needsBody = this.hasBodyParam(params);
    const methodInfo = { args, params, needsBody };

    this.setCachedMethod(instance, methodName, methodInfo);

    return methodInfo;
  }

  private setCachedMethod(
    instance: any,
    methodName: string,
    methodInfo: MethodCache
  ): void {
    const cachedMethod = this.historyMethods.get(instance) || {};
    cachedMethod[methodName] = methodInfo;
    this.historyMethods.set(instance, cachedMethod);
  }

  private resolveMethodServices(
    methodInfo: MethodCache,
    context: Context,
    locals: LocalsContainer,
    invokeCallback: (token: TokenProvider, locals: LocalsContainer) => any
  ): any[] {
    const { args, params } = methodInfo;
    const services = [];

    for (let index = 0; index < args.length; index++) {
      const service = this.resolveService(
        args[index],
        params[index],
        context,
        locals,
        invokeCallback
      );
      services.push(service);
    }

    return services;
  }

  private async ensureBodyParsed(
    methodInfo: MethodCache,
    context: Context
  ): Promise<void> {
    if (!methodInfo.needsBody) {
      return;
    }

    if (context.isBodyParsed()) {
      return;
    }

    await context.getBody();
  }

  private hasBodyParam(params: any): boolean {
    if (!params) {
      return false;
    }

    return Object.values(params).some((param) => this.isBodyParam(param));
  }

  private isBodyParam(param: any): boolean {
    if (param?.type === "body") {
      return true;
    }

    if (!param?.fun) {
      return false;
    }

    return String(param.fun).includes("context.body");
  }

  private resolveService(
    token: any,
    param: any,
    context: Context,
    locals: LocalsContainer,
    invokeCallback: (token: TokenProvider, locals: LocalsContainer) => any
  ): any {
    if (!param) {
      return invokeCallback(getClassOrSymbol(token), locals);
    }

    const value = param.fun(context, param.param);

    return this.validatorAdapter.hasValidation(token)
      ? this.validatorAdapter.validateAndTransform(token, value)
      : value;
  }
}

