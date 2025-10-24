import { InjectorService, TokenRouteWithProvider } from "../container";
import { Context, LocalsContainer } from "../domain";
import { EventType } from "../events";

class Router {
    private readonly jsonHeaders = { "Content-Type": "application/json" };
    private readonly textHeaders = { "Content-Type": "text/html" };

    public async executeRoute(
        route: TokenRouteWithProvider,
        injector: InjectorService,
        context: Context,
        locals: LocalsContainer
    ): Promise<Response> {
        const provider = injector.invoke(route.provider, locals);

        route.provider.instance = provider;

        // @ts-ignore
        if (!provider[route.methodName]) {
            throw new Error("Controller not found");
        }

        const result = await injector.invokeRoute(route, context, locals);

        await injector.callHook(EventType.OnResponse, { context, result });

        return this.mountResponse(result, context);
    }

    private mountResponse(result: unknown, context: Context) {
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

        return this.createJsonResponse(result, status);
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

    private createJsonResponse(body: unknown, status: number) {
        try {
            const json = JSON.stringify(body);

            return new Response(json, { status, headers: this.jsonHeaders });
        } catch (error) {
            const fallback = JSON.stringify({ error: "Serialization failed" });

            return new Response(fallback, { status: 500, headers: this.jsonHeaders });
        }
    }
}

export const RouteExecutor = new Router();
