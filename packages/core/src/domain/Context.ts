import { Server } from 'bun';
import { Injectable } from '../commons/decorators/Injectable.decorator';
import { ProviderScope } from './provider-scope';


@Injectable({ scope: ProviderScope.REQUEST })
export class Context {

  query: Record<string, any> = {}
  body: Record<string, any> = {}
  rawBody?: ArrayBuffer;
  param: Record<string, any> = {}
  req: Request;
  headers: Request["headers"] = new Headers();
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


  static createFromJob(job: any): Context {
    const context = new Context();

    context.setTrackingIdFromJob(job);

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

  private setReq(req: Request) {
    this.req = req;
  }

  private setHeaders(headers: Request["headers"]) {
    this.headers = headers;
  }

  private setTrackingId(request: Request) {
    const headerTrackingId = request.headers.get('x-tracking-id');

    if (headerTrackingId) {
      this.trackingId = headerTrackingId;
      return;
    }

    this.trackingId = crypto.randomUUID();
  }


  private setTrackingIdFromJob(job: any) {
    const trackingIdFromData = job.data?.__trackingId;

    if (trackingIdFromData) {
      this.trackingId = trackingIdFromData;
      return;
    }

    const trackingIdFromProperty = job.trackingId;

    if (trackingIdFromProperty) {
      this.trackingId = trackingIdFromProperty;
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
    this.rawBody = await request.clone().arrayBuffer();

    if (contentType.includes('application/json')) {
      this.body = await request.clone().json();
      return;
    }

    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      this.setBody(await request.clone().formData());
      return;
    }

    this.body = { body: await request.clone().text() };
  }
}
