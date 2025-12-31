import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { ApplicationConfig } from "../Carno";
import { TokenProvider } from "../commons/registries/ProviderControl";
import { Context } from "../domain/Context";
import { LocalsContainer } from "../domain/LocalsContainer";
import { Metadata } from "../domain/Metadata";
import { HttpException } from "../exceptions/HttpException";
import { getClassOrSymbol } from "../utils/getClassOrSymbol";
import { getMethodArgTypes } from "../utils/getMethodArgTypes";
import { isClassValidator } from "../utils/isClassValidator";

type MethodCache = {
  args: any;
  params: any;
};

export class MethodInvoker {
  private historyMethods: WeakMap<any, { [key: string]: MethodCache }> =
    new WeakMap();

  constructor(private applicationConfig: ApplicationConfig) {}

  async invoke(
    instance: any,
    methodName: string,
    locals: LocalsContainer,
    context: Context,
    invokeCallback: (token: TokenProvider, locals: LocalsContainer) => any
  ): Promise<any> {
    const methodInfo = this.getMethodInfo(instance, methodName);
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
    const methodInfo = { args, params };

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

    return isClassValidator(token)
      ? this.validateAndTransform(token, value)
      : value;
  }

  private validateAndTransform(token: any, value: any): any {
    const obj = plainToInstance(token, value);
    const errors = validateSync(obj, this.applicationConfig.validation);
    // todo: deve retornar apenas os erros e não o objeto class-validator inteiro.
    if (errors.length > 0) {
      throw new HttpException(errors, 400);
    }

    return obj;
  }
}
