import { InjectorService, TokenRouteWithProvider } from "../container";
import { Context, LocalsContainer } from "../domain";
import { EventType } from "../events";
import { hasJsonMethod } from "../utils/hasJsonMethod";

class Router {
    private toJsonCache = new WeakMap<object, (() => unknown) | null>();

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

        injector.callHook(EventType.OnResponse, { context, result });

        return this.mountResponse(result, context);
    }

    private mountResponse(result: unknown, context: Context) {
        if (this.isNativeResponse(result)) {
            return result;
        }

        if (this.isStreamLike(result) || this.isBodyInit(result)) {
            return this.createBodyResponse(result as BodyInit, context);
        }

        if (typeof result === "string") {
            return this.createTextResponse(result, context);
        }

        if (result === null || typeof result === "undefined") {
            return this.createTextResponse("", context);
        }

        if (typeof result === "number" || typeof result === "boolean") {
            return this.createTextResponse(String(result), context);
        }

        const serialized = this.serializeResult(result);

        return this.createJsonResponse(serialized, context);
    }

    private isNativeResponse(result: unknown): result is Response {
        return result instanceof Response;
    }

    private isStreamLike(result: unknown): result is ReadableStream {
        if (!result) {
            return false;
        }

        // @ts-ignore
        return typeof (result as any).getReader === "function";
    }

    private isBodyInit(result: unknown) {
        if (!result) {
            return false;
        }

        if (result instanceof Blob || result instanceof ArrayBuffer) {
            return true;
        }

        if (ArrayBuffer.isView(result as any)) {
            return true;
        }

        if (result instanceof FormData || result instanceof URLSearchParams) {
            return true;
        }

        return result instanceof ReadableStream;
    }

    private createBodyResponse(body: BodyInit, context: Context) {
        return new Response(body, {
            status: this.resolveStatus(context)
        });
    }

    private createTextResponse(body: string, context: Context) {
        return new Response(body, {
            status: this.resolveStatus(context),
            headers: { "Content-Type": "text/html" }
        });
    }

    private createJsonResponse(body: unknown, context: Context) {
        return new Response(JSON.stringify(body), {
            status: this.resolveStatus(context),
            headers: { "Content-Type": "application/json" }
        });
    }

    private resolveStatus(context: Context) {
        return context.getResponseStatus() || 200;
    }

    private serializeResult(result: unknown): unknown {
        if (Array.isArray(result)) {
            return result.map((item) => this.serializeResult(item));
        }

        if (this.hasToJson(result)) {
            return this.invokeToJson(result as object);
        }

        if (this.isPlainObject(result)) {
            return this.serializePlainObject(result as Record<string, unknown>);
        }

        return result;
    }

    private hasToJson(value: unknown) {
        return typeof value === "object" && value !== null && hasJsonMethod(value);
    }

    private invokeToJson(value: object) {
        const cached = this.resolveToJson(value);

        if (!cached) {
            return value;
        }

        return cached();
    }

    private resolveToJson(value: object) {
        if (!this.toJsonCache.has(value)) {
            const fn = hasJsonMethod(value) ? (value as any).toJSON.bind(value) : null;
            this.toJsonCache.set(value, fn);
        }

        return this.toJsonCache.get(value);
    }

    private isPlainObject(value: unknown): value is Record<string, unknown> {
        if (!value || typeof value !== "object") {
            return false;
        }

        const proto = Object.getPrototypeOf(value);

        return proto === Object.prototype || proto === null;
    }

    private serializePlainObject(result: Record<string, unknown>) {
        const entries = Object.entries(result).map(([key, value]) => {
            return [key, this.serializeResult(value)];
        });

        return Object.fromEntries(entries);
    }
}

export const RouteExecutor = new Router();