import { InjectorService, TokenRouteWithProvider } from "../container";
import { Context, LocalsContainer } from "../domain";
import { EventType } from "../events";

class Router {
    private toJsonCache = new WeakMap<object, Function | null>();

    public async executeRoute(route: TokenRouteWithProvider, injector: InjectorService, context: Context, locals: LocalsContainer): Promise<Response> {
        const provider = injector.invoke(route.provider, locals);

        route.provider.instance = provider;

        // @ts-ignore
        if (!provider[route.methodName]) {
            throw new Error('Controller not found');
        }


        const result = await injector.invokeRoute(route, context, locals);

        injector.callHook(EventType.OnResponse, {context, result})

        return this.mountResponse(result, context);
    }

    private serializeForJson(value: any): any {
        if (value == null) return value;

        if (Array.isArray(value)) {
            const len = value.length;
            const result = new Array(len);
            for (let i = 0; i < len; i++) {
                result[i] = this.serializeForJson(value[i]);
            }
            return result;
        }

        if (typeof value === 'object') {
            let toJSONFn = this.toJsonCache.get(Object.getPrototypeOf(value));

            if (toJSONFn === undefined) {
                let proto: any = value;
                toJSONFn = null;

                while (proto && proto !== Object.prototype) {
                    const desc = Object.getOwnPropertyDescriptor(proto, 'toJSON');
                    if (desc && typeof desc.value === 'function') {
                        toJSONFn = desc.value;
                        break;
                    }
                    proto = Object.getPrototypeOf(proto);
                }

                this.toJsonCache.set(Object.getPrototypeOf(value), toJSONFn);
            }

            if (toJSONFn) {
                try {
                    return toJSONFn.call(value);
                } catch {
                    // Se falhar, retorna o valor original (sem quebrar fluxo)
                }
            }
        }

        return value;
    }

    private mountResponse(result: any, context: Context) {
        let payload: string | any;
        let contentType: string;

        if (result instanceof Response) {
            return result;
        }

        switch (typeof result) {
            case 'string':
                payload = result;
                contentType = 'text/html';
                break;
            case 'object':
                const serialized = this.serializeForJson(result);
                payload = JSON.stringify(serialized);
                contentType = 'application/json';
                break;
            default:
                payload = result;
                contentType = 'text/plain';
        }

        return new Response(payload, {
            status: context.getResponseStatus() || 201,
            headers: {'Content-Type': contentType}
        });
    }
}

export const RouteExecutor = new Router();