import { Server } from 'bun';
import { HttpCode } from '../commons/http-code.enum';
import { Injectable } from '../commons/decorators/Injectable.decorator';
import { HttpException } from '../exceptions/HttpException';
import { ProviderScope } from './provider-scope';

/**
 * Context otimizado com shape mínimo e lazy loading.
 *
 * Shape fixo mínimo (sempre alocado):
 * - req: Request
 * - param: Record<string, string>
 * - status: number
 *
 * Lazy loading (só aloca quando usado):
 * - query: Record<string, string> (getter lazy)
 * - headers: Headers (getter que retorna req.headers)
 * - body: Record<string, any> (getter lazy)
 * - locals: Record<string, any> (getter lazy)
 * - rawBody: ArrayBuffer (lazy)
 *
 * V8/JSC otimiza shape consistente. Propriedades lazy não quebram
 * monomorfismo porque são getters, não props dinâmicas.
 * 
 * OPTIMIZATION: Object pooling for ultra-fast context creation.
 * Pool is limited to prevent memory leaks.
 */
@Injectable({ scope: ProviderScope.REQUEST })
export class Context {
  // Object pool for context reuse
  private static readonly pool: Context[] = [];
  private static readonly MAX_POOL_SIZE = 128;

  // Pre-allocated empty objects (frozen for V8 optimization)
  private static readonly EMPTY_PARAMS: Readonly<Record<string, string>> = Object.freeze({});
  private static readonly EMPTY_BODY: Readonly<Record<string, any>> = Object.freeze({});

  req!: Request;

  param!: Record<string, string>;

  status!: number;

  private _queryString: string | undefined;

  private _query: Record<string, string> | null = null;

  private _locals: Record<string, any> | null = null;

  private _body: Record<string, any> | null = null;

  private _rawBody: ArrayBuffer | null = null;

  private _bodyParsed: boolean = false;

  /**
   * Constructor is public for test compatibility.
   * In production, use static factory methods for pooling benefits.
   */
  constructor() {
    this.status = 200;
  }

  /**
   * Reset context for reuse from pool.
   * Inline for performance.
   */
  private reset(): void {
    this.status = 200;
    this._queryString = undefined;
    this._query = null;
    this._locals = null;
    this._body = null;
    this._rawBody = null;
    this._bodyParsed = false;
  }

  /**
   * Return context to pool for reuse.
   * Call this when done with the context.
   */
  release(): void {
    if (Context.pool.length < Context.MAX_POOL_SIZE) {
      this.reset();
      Context.pool.push(this);
    }
  }

  /**
   * Get a context from pool or create new.
   * Inline allocation for speed.
   */
  private static acquire(): Context {
    const pooled = Context.pool.pop();
    if (pooled) return pooled;
    return new Context();
  }

  get headers(): Headers {
    return this.req.headers;
  }

  get query(): Record<string, string> {
    if (this._query === null) {
      this._query = this.parseQueryString();
    }

    return this._query;
  }

  set query(value: Record<string, string>) {
    this._query = value;
  }

  get locals(): Record<string, any> {
    if (this._locals === null) {
      this._locals = {};
    }

    return this._locals;
  }

  set locals(value: Record<string, any>) {
    this._locals = value;
  }

  get body(): Record<string, any> {
    if (this._body === null) {
      return {};
    }

    return this._body;
  }

  set body(value: Record<string, any>) {
    this._body = value;
    this._bodyParsed = true;
  }

  get rawBody(): ArrayBuffer | undefined {
    return this._rawBody ?? undefined;
  }

  set rawBody(value: ArrayBuffer | undefined) {
    this._rawBody = value ?? null;
  }

  async getBody(): Promise<Record<string, any>> {
    if (!this._bodyParsed) {
      await this.parseBody();
    }

    return this._body ?? {};
  }

  isBodyParsed(): boolean {
    return this._bodyParsed;
  }

  setResponseStatus(status: number): void {
    this.status = status;
  }

  getResponseStatus(): number {
    return this.status;
  }

  setParam(param: Record<string, string>): void {
    this.param = param;
  }

  /**
   * Sync context creation with pooling.
   * Optimized: uses char code comparison instead of string comparison.
   */
  static createFromRequestSync(
    url: { query?: string },
    request: Request,
    server: Server<any>
  ): Context {
    const ctx = Context.acquire();

    ctx.req = request;
    ctx.param = Context.EMPTY_PARAMS as Record<string, string>;
    ctx._queryString = url.query;

    // Use char code for faster comparison: G=71, H=72
    const methodChar = request.method.charCodeAt(0);
    ctx._bodyParsed = methodChar === 71 || methodChar === 72; // GET or HEAD

    return ctx;
  }

  /**
   * Ultra-fast context for simple GET routes.
   * Minimal allocations, maximum speed.
   */
  static createFastContext(
    request: Request,
    params: Record<string, any>
  ): Context {
    const ctx = Context.acquire();

    ctx.req = request;
    ctx.param = params;
    ctx._bodyParsed = true;

    return ctx;
  }

  static async createFromRequest(
    url: { query?: string },
    request: Request,
    server: Server<any>
  ): Promise<Context> {
    const ctx = Context.createFromRequestSync(url, request, server);

    if (!ctx._bodyParsed) {
      await ctx.getBody();
    }

    return ctx;
  }

  static createFromJob(job: any): Context {
    return Context.acquire();
  }

  /**
   * Optimized query string parsing.
   * Uses native URLSearchParams but only when needed.
   */
  private parseQueryString(): Record<string, string> {
    const qs = this._queryString;
    if (!qs) return Context.EMPTY_BODY as Record<string, string>;

    // Fast path for simple single-param queries
    const eqIdx = qs.indexOf('=');
    if (eqIdx === -1) return Context.EMPTY_BODY as Record<string, string>;

    const ampIdx = qs.indexOf('&');
    if (ampIdx === -1) {
      // Single param - avoid URLSearchParams overhead
      return { [decodeURIComponent(qs.slice(0, eqIdx))]: decodeURIComponent(qs.slice(eqIdx + 1)) };
    }

    // Multiple params - use native
    return Object.fromEntries(new URLSearchParams(qs));
  }

  private async parseBody(): Promise<void> {
    this._bodyParsed = true;

    const contentType = this.req.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      this._body = await this.parseJsonBody();
      return;
    }

    if (contentType.includes('multipart/form-data')) {
      this._body = await this.parseFormDataBody();
      return;
    }

    if (contentType.includes('application/x-www-form-urlencoded')) {
      this._body = await this.parseUrlEncodedBody();
      return;
    }

    this._body = {};
  }

  private async parseJsonBody(): Promise<Record<string, any>> {
    const contentLength = this.req.headers.get('content-length');

    if (contentLength === '0') {
      return {};
    }

    try {
      const payload = await this.req.json();

      return payload as Record<string, any>;
    } catch {
      throw new HttpException('Invalid JSON body', HttpCode.BAD_REQUEST);
    }
  }

  private async parseFormDataBody(): Promise<Record<string, any>> {
    const formData = await this.req.formData();
    const result: Record<string, any> = {};

    for (const [key, value] of formData.entries()) {
      result[key] = value;
    }

    return result;
  }

  private async parseUrlEncodedBody(): Promise<Record<string, any>> {
    const text = await this.req.text();

    if (!text) {
      return {};
    }

    return Object.fromEntries(new URLSearchParams(text));
  }
}
