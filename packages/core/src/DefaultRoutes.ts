import { Controller } from './decorators/Controller';
import { Get } from './decorators/methods';

/**
 * Default routes controller.
 * Auto-registered by Turbo for common endpoints.
 */
@Controller()
export class DefaultRoutes {

    /**
     * Favicon - returns empty response to prevent 404.
     */
    @Get('/favicon.ico')
    favicon() {
        return new Response(null, { status: 204 });
    }
}

/**
 * Pre-compiled static responses for maximum performance.
 * Use these directly in Bun.serve static routes.
 */
export const DEFAULT_STATIC_ROUTES = {
    '/health': new Response('{"status":"ok"}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    }),
    '/ready': new Response('{"ready":true}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    }),
    '/favicon.ico': new Response(null, { status: 204 })
};
