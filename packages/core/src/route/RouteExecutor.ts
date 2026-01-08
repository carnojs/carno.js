import { InjectorService, TokenRouteWithProvider } from "../container";
import { Context, LocalsContainer } from "../domain";
import { EventType } from "../events";
import type { CompiledRoute } from "./CompiledRoute";
import { buildResponse } from "./FastResponse";

class Router {
    public async executeRoute(
        routeStore: CompiledRoute | TokenRouteWithProvider,
        injector: InjectorService,
        context: Context,
        locals: LocalsContainer
    ): Promise<Response> {
        const isCompiled = (routeStore as CompiledRoute).routeType !== undefined;

        const tokenRoute = isCompiled
            ? (routeStore as CompiledRoute).original
            : routeStore as TokenRouteWithProvider;

        const controllerInstance = isCompiled
            ? (routeStore as CompiledRoute).controllerInstance
            : null;

        const controller = controllerInstance
            ?? injector.resolveControllerInstance(
                tokenRoute.provider,
                locals
            );

        if (!controller[tokenRoute.methodName]) {
            throw new Error("Controller not found");
        }

        const result = await injector.invokeRoute(
            tokenRoute,
            context,
            locals,
            controller
        );

        if (injector.hasOnResponseHook()) {
            await injector.callHook(EventType.OnResponse, { context, result });
        }

        return buildResponse(result, context.status || 200);
    }

    public mountResponse(result: unknown, context: Context): Response {
        return buildResponse(result, context.status || 200);
    }
}

export const RouteExecutor = new Router();


