/**
 * CORS Configuration types.
 */
export type CorsOrigin =
    | string
    | string[]
    | RegExp
    | ((origin: string) => boolean);

export interface CorsConfig {
    origins: CorsOrigin;
    methods?: string[];
    allowedHeaders?: string[];
    exposedHeaders?: string[];
    credentials?: boolean;
    maxAge?: number;
}

export const DEFAULT_CORS_METHODS = ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'];
export const DEFAULT_CORS_HEADERS = ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'];

type OriginMatcher = (origin: string) => boolean;

/**
 * CORS Handler - Pre-computes headers at startup for maximum performance.
 */
export class CorsHandler {
    private readonly cache = new Map<string, Record<string, string>>();
    private readonly methodsStr: string;
    private readonly headersStr: string;
    private readonly exposedStr: string | null;
    private readonly maxAgeStr: string | null;
    private readonly hasCredentials: boolean;
    private readonly isWildcard: boolean;
    private readonly matcher: OriginMatcher;

    // Pre-created preflight response for wildcard CORS
    private readonly preflightResponse: Response | null = null;

    constructor(config: CorsConfig) {
        this.methodsStr = (config.methods || DEFAULT_CORS_METHODS).join(', ');
        this.headersStr = (config.allowedHeaders || DEFAULT_CORS_HEADERS).join(', ');
        this.exposedStr = config.exposedHeaders?.join(', ') || null;
        this.maxAgeStr = config.maxAge?.toString() || null;
        this.hasCredentials = !!config.credentials;
        this.isWildcard = config.origins === '*';
        this.matcher = this.buildMatcher(config.origins);

        // Pre-create preflight response for wildcard
        if (this.isWildcard) {
            this.preflightResponse = new Response(null, {
                status: 204,
                headers: this.buildHeaders('*')
            });
        }
    }

    /**
     * Handle preflight (OPTIONS) request.
     */
    preflight(origin: string): Response {
        if (this.isWildcard && this.preflightResponse) {
            return this.preflightResponse.clone();
        }

        if (!this.isAllowed(origin)) {
            return new Response(null, { status: 403 });
        }

        return new Response(null, {
            status: 204,
            headers: this.getHeaders(origin)
        });
    }

    /**
     * Apply CORS headers to a response.
     */
    apply(response: Response, origin: string): Response {
        if (!this.isAllowed(origin)) {
            return response;
        }

        const headers = this.getHeaders(origin);
        for (const [key, value] of Object.entries(headers)) {
            response.headers.set(key, value);
        }

        return response;
    }

    /**
     * Check if origin is allowed.
     */
    isAllowed(origin: string): boolean {
        return this.matcher(origin);
    }

    /**
     * Get cached CORS headers for origin.
     */
    private getHeaders(origin: string): Record<string, string> {
        const key = this.isWildcard ? '*' : origin;
        let headers = this.cache.get(key);

        if (!headers) {
            headers = this.buildHeaders(origin);
            this.cache.set(key, headers);
        }

        return headers;
    }

    private buildHeaders(origin: string): Record<string, string> {
        const headers: Record<string, string> = {
            'Access-Control-Allow-Origin': this.isWildcard ? '*' : origin,
            'Access-Control-Allow-Methods': this.methodsStr,
            'Access-Control-Allow-Headers': this.headersStr
        };

        if (this.hasCredentials) {
            headers['Access-Control-Allow-Credentials'] = 'true';
        }
        if (this.exposedStr) {
            headers['Access-Control-Expose-Headers'] = this.exposedStr;
        }
        if (this.maxAgeStr) {
            headers['Access-Control-Max-Age'] = this.maxAgeStr;
        }

        return headers;
    }

    private buildMatcher(origins: CorsOrigin): OriginMatcher {
        if (origins === '*') return () => true;
        if (typeof origins === 'string') return (o) => o === origins;
        if (Array.isArray(origins)) {
            const set = new Set(origins);
            return (o) => set.has(o);
        }
        if (origins instanceof RegExp) return (o) => origins.test(o);
        if (typeof origins === 'function') return origins;
        return () => false;
    }
}
