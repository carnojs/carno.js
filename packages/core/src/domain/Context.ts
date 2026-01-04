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
 */
@Injectable({ scope: ProviderScope.REQUEST })
export class Context {

  req: Request;

  param: Record<string, string>;

  status: number;

  private _queryString: string | undefined;

  private _query: Record<string, string> | null = null;

  private _locals: Record<string, any> | null = null;

  private _body: Record<string, any> | null = null;

  private _rawBody: ArrayBuffer | null = null;

  private _bodyParsed: boolean = false;

  private constructor() {
    this.req = undefined as any;
    this.status = 200;
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

  static createFromRequestSync(
    url: { query?: string },
    request: Request,
    server: Server<any>
  ): Context {
    const ctx = new Context();

    ctx.req = request;
    ctx.param = {};
    ctx._queryString = url.query;

    const method = request.method;

    if (method !== 'GET' && method !== 'HEAD') {
      ctx._bodyParsed = false;
    } else {
      ctx._bodyParsed = true;
    }

    return ctx;
  }

  static createFastContext(
    request: Request,
    params: Record<string, any>
  ): Context {
    const ctx = new Context();

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
    return new Context();
  }

  private parseQueryString(): Record<string, string> {
    if (!this._queryString) {
      return {};
    }

    return Object.fromEntries(new URLSearchParams(this._queryString));
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
