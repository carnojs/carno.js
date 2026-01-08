/**
 * Request Context for Turbo.
 * 
 * Lazy initialization for maximum performance:
 * - Query parsed only when accessed
 * - Body parsed only when needed
 * - Minimal allocations in hot path
 */

const EMPTY_PARAMS: Record<string, string> = Object.freeze({}) as Record<string, string>;

export class Context {
    readonly req: Request;
    params: Record<string, string>;
    private _query: Record<string, string> | null = null;
    private _body: any = undefined;
    private _bodyParsed = false;
    private _url: URL | null = null;

    status = 200;

    constructor(req: Request, params: Record<string, string> = EMPTY_PARAMS) {
        this.req = req;
        this.params = params;
    }

    get url(): URL {
        if (!this._url) {
            this._url = new URL(this.req.url);
        }

        return this._url;
    }

    get query(): Record<string, string> {
        if (!this._query) {
            this._query = Object.fromEntries(this.url.searchParams);
        }

        return this._query;
    }

    get body(): any {
        return this._body;
    }

    async parseBody(): Promise<any> {
        if (this._bodyParsed) {
            return this._body;
        }

        this._bodyParsed = true;
        const contentType = this.req.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
            this._body = await this.req.json();
        } else if (contentType.includes('form')) {
            const formData = await this.req.formData();
            this._body = Object.fromEntries(formData);
        } else if (contentType.includes('text')) {
            this._body = await this.req.text();
        } else {
            this._body = await this.req.arrayBuffer();
        }

        return this._body;
    }

    get method(): string {
        return this.req.method;
    }

    get headers(): Headers {
        return this.req.headers;
    }

    get path(): string {
        return this.url.pathname;
    }

    json(data: any, status?: number): Response {
        if (status) this.status = status;

        return Response.json(data, { status: this.status });
    }

    text(data: string, status?: number): Response {
        if (status) this.status = status;

        return new Response(data, {
            status: this.status,
            headers: { 'Content-Type': 'text/plain' }
        });
    }

    html(data: string, status?: number): Response {
        if (status) this.status = status;

        return new Response(data, {
            status: this.status,
            headers: { 'Content-Type': 'text/html' }
        });
    }

    redirect(url: string, status: number = 302): Response {
        return Response.redirect(url, status);
    }
}
