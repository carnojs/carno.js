import { Server } from 'bun';
import { Injectable } from '../commons/decorators/Injectable.decorator';
import { ProviderScope } from './provider-scope';


@Injectable({ scope: ProviderScope.REQUEST })
export class Context {

  query: Record<string, any> = {}
  body: Record<string, any> = {}
  param: Record<string, any> = {}
  req: Record<string, any> = {};
  headers: Record<string, any> = {};
  locals: Record<string, any> = {};
  trackingId: string;

  private resultStatus: number;
  private constructor() {}

  static async createFromRequest(url: any, request: Request, server: Server<any>) {
    const context = new Context();
    context.setQuery(url);

    if (request.method !== 'GET') {
      await context.resolveBody(request);
    }

    context.setReq(request);
    // @ts-ignore
    context.setHeaders(request.headers);
    context.setTrackingId(request);

    return context;
  }

  // @ts-ignore
  private setQuery({ query }: { query?: string }) {
    this.query = this.buildQueryObject(query);
  }

  private setBody(body: any) {
    for (const [key, value] of body.entries()) {
      this.body[key] = value;
    }
  }

  private setReq(req: Record<string, any>) {
    this.req = req;
  }

  private setHeaders(headers: Headers) {
    for (const [key, value] of headers.entries()) {
      this.headers[key] = value;
    }
  }

  private setTrackingId(request: Request) {
    const headerTrackingId = request.headers.get('x-tracking-id');

    if (headerTrackingId) {
      this.trackingId = headerTrackingId;
      return;
    }

    this.trackingId = crypto.randomUUID();
  }

  setParam(param: Record<string, any>) {
    this.param = param;
  }

  setResponseStatus(status: number) {
    this.resultStatus = status;
  }

  getResponseStatus() {
    return this.resultStatus;
  }

  private buildQueryObject(query?: string) {
    return query ? Object.fromEntries(new URLSearchParams(query)) : {};
  }

  private async resolveBody(request: Request) {
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      this.body = await request.json();
      return;
    }

    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      this.setBody(await request.formData());
      return;
    }

    this.body = { body: await request.text() };
  }
}
