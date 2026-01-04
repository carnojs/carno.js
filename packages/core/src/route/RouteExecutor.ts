import { InjectorService, TokenRouteWithProvider } from "../container";
import { Context, LocalsContainer } from "../domain";
import { EventType } from "../events";
import type { CompiledRoute } from "./CompiledRoute";

class Router {
    private readonly textHeaders = { "Content-Type": "text/html" };

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

        const status = context.getResponseStatus() || 200;

        if (result instanceof Response) {
            return result;
        }

        if (result === null || result === undefined) {
            return new Response("", { status, headers: this.textHeaders });
        }

        const resultType = typeof result;

        if (resultType === "string") {
            return new Response(result as string, { status, headers: this.textHeaders });
        }

        if (resultType === "number" || resultType === "boolean") {
            return new Response(String(result), { status, headers: this.textHeaders });
        }

        if (this.isBodyInit(result)) {
            return new Response(result as BodyInit, { status });
        }

        return Response.json(result, { status });
    }

    public mountResponse(result: unknown, context: Context) {
        const status = context.getResponseStatus() || 200;

        if (this.isNativeResponse(result)) {
            return result;
        }

        if (result === null || result === undefined) {
            return new Response("", { status, headers: this.textHeaders });
        }

        const resultType = typeof result;

        if (resultType === "string") {
            return new Response(result as string, { status, headers: this.textHeaders });
        }

        if (resultType === "number" || resultType === "boolean") {
            return new Response(String(result), { status, headers: this.textHeaders });
        }

        if (this.isBodyInit(result)) {
            return new Response(result as BodyInit, { status });
        }

        return Response.json(result, { status });
    }

    private isNativeResponse(result: unknown): result is Response {
        return result instanceof Response;
    }

    private isBodyInit(result: unknown): result is BodyInit {
        if (!result) {
            return false;
        }

        if (result instanceof ReadableStream) {
            return true;
        }

        if (result instanceof Blob || result instanceof ArrayBuffer) {
            return true;
        }

        if (ArrayBuffer.isView(result as any)) {
            return true;
        }

        return result instanceof FormData || result instanceof URLSearchParams;
    }
}

export const RouteExecutor = new Router();


