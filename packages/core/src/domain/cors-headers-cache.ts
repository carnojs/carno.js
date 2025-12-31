import { CorsConfig, DEFAULT_CORS_METHODS, DEFAULT_CORS_ALLOWED_HEADERS } from './cors-config';

export class CorsHeadersCache {
  private readonly cache = new Map<string, Record<string, string>>();
  private readonly methodsString: string;
  private readonly allowedHeadersString: string;
  private readonly exposedHeadersString: string | null;
  private readonly maxAgeString: string | null;
  private readonly hasCredentials: boolean;
  private readonly isWildcard: boolean;

  constructor(private readonly config: CorsConfig) {
    const methods = config.methods || DEFAULT_CORS_METHODS;
    this.methodsString = methods.join(', ');

    const allowedHeaders = config.allowedHeaders || DEFAULT_CORS_ALLOWED_HEADERS;
    this.allowedHeadersString = allowedHeaders.join(', ');

    this.exposedHeadersString = config.exposedHeaders?.length
      ? config.exposedHeaders.join(', ')
      : null;

    this.maxAgeString = config.maxAge !== undefined
      ? config.maxAge.toString()
      : null;

    this.hasCredentials = !!config.credentials;
    this.isWildcard = config.origins === '*';
  }

  get(origin: string): Record<string, string> {
    const cacheKey = this.isWildcard ? '*' : origin;
    let cached = this.cache.get(cacheKey);

    if (cached) {
      return cached;
    }

    cached = this.buildHeaders(origin);
    this.cache.set(cacheKey, cached);

    return cached;
  }

  private buildHeaders(origin: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Access-Control-Allow-Origin': this.isWildcard ? '*' : origin,
      'Access-Control-Allow-Methods': this.methodsString,
      'Access-Control-Allow-Headers': this.allowedHeadersString,
    };

    if (this.hasCredentials) {
      headers['Access-Control-Allow-Credentials'] = 'true';
    }

    if (this.exposedHeadersString) {
      headers['Access-Control-Expose-Headers'] = this.exposedHeadersString;
    }

    if (this.maxAgeString) {
      headers['Access-Control-Max-Age'] = this.maxAgeString;
    }

    return headers;
  }

  applyToResponse(response: Response, origin: string): Response {
    const corsHeaders = this.get(origin);

    for (const key in corsHeaders) {
      response.headers.set(key, corsHeaders[key]);
    }

    return response;
  }
}
