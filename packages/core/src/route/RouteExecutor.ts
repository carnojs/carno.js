import { InjectorService, TokenRouteWithProvider } from "../container";
import { Context, LocalsContainer } from "../domain";
import { EventType } from "../events";
import type { CompiledRoute } from "./CompiledRoute";

/**
 * Pre-frozen headers for V8 hidden class optimization.
 */
const TEXT_HEADERS: Readonly<Record<string, string>> = Object.freeze({
    "Content-Type": "text/html"
});

/**
 * Ultra-fast BodyInit detection.
 * Ordered by frequency in typical web apps.
 */
function isBodyInit(result: unknown): result is BodyInit {
    if (!result) return false;
    if (result instanceof ReadableStream) return true;
    if (result instanceof Blob) return true;
    if (result instanceof ArrayBuffer) return true;
    if (ArrayBuffer.isView(result as any)) return true;
    if (result instanceof FormData) return true;
    if (result instanceof URLSearchParams) return true;
    return false;
}

/**
 * Centralized response builder.
 * Single function for V8 inline caching optimization.
 */
function buildResponse(result: unknown, status: number): Response {
    // Fast path: string (most common)
    if (typeof result === 'string') {
        return new Response(result, { status, headers: TEXT_HEADERS });
    }

    // Already a Response
    if (result instanceof Response) return result;

    // Null/undefined
    if (result == null) {
        return new Response('', { status, headers: TEXT_HEADERS });
    }

    // Primitives
    const t = typeof result;
    if (t === 'number' || t === 'boolean') {
        return new Response(String(result), { status, headers: TEXT_HEADERS });
    }

    // BodyInit types
    if (isBodyInit(result)) {
        return new Response(result as BodyInit, { status });
    }

    // Object - use native Response.json for maximum performance
    return Response.json(result, { status });
}

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


