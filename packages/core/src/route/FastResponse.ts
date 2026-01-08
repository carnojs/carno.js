/**
 * Ultra-optimized Response factory.
 *
 * Pre-computes Response options and headers for maximum performance.
 * Uses frozen objects for V8 hidden class optimization.
 */

const TEXT_HEADERS = Object.freeze({
  'Content-Type': 'text/html'
});

const JSON_HEADERS = Object.freeze({
  'Content-Type': 'application/json'
});

const TEXT_200_OPTS = Object.freeze({
  status: 200,
  headers: TEXT_HEADERS
});

const JSON_200_OPTS = Object.freeze({
  status: 200,
  headers: JSON_HEADERS
});

const TEXT_201_OPTS = Object.freeze({
  status: 201,
  headers: TEXT_HEADERS
});

const TEXT_204_OPTS = Object.freeze({
  status: 204,
  headers: TEXT_HEADERS
});

function selectTextOpts(status: number): ResponseInit {
  if (status === 200) return TEXT_200_OPTS;
  if (status === 201) return TEXT_201_OPTS;
  if (status === 204) return TEXT_204_OPTS;

  return { status, headers: TEXT_HEADERS };
}

function selectJsonOpts(status: number): ResponseInit {
  if (status === 200) return JSON_200_OPTS;

  return { status, headers: JSON_HEADERS };
}

function isBodyInit(r: unknown): r is BodyInit {
  if (!r) return false;
  if (r instanceof ReadableStream) return true;
  if (r instanceof Blob) return true;
  if (r instanceof ArrayBuffer) return true;
  if (ArrayBuffer.isView(r as ArrayBufferView)) return true;
  if (r instanceof FormData) return true;
  if (r instanceof URLSearchParams) return true;

  return false;
}

export function buildTextResponse(
  text: string,
  status: number = 200
): Response {
  return new Response(text, selectTextOpts(status));
}

export function buildJsonResponse(
  data: unknown,
  status: number = 200
): Response {
  return Response.json(data, selectJsonOpts(status));
}

export function buildResponse(r: unknown, status: number): Response {
  if (typeof r === 'string') {
    return new Response(r, selectTextOpts(status));
  }

  if (r instanceof Response) {
    return r;
  }

  if (r == null) {
    return new Response('', selectTextOpts(status));
  }

  const t = typeof r;

  if (t === 'number' || t === 'boolean') {
    return new Response(String(r), selectTextOpts(status));
  }

  if (isBodyInit(r)) {
    return new Response(r, { status });
  }

  return Response.json(r, selectJsonOpts(status));
}

export function createStaticTextHandler(
  text: string,
  status: number = 200
): () => Response {
  const opts = selectTextOpts(status);

  return () => new Response(text, opts);
}

export function createStaticJsonHandler(
  data: unknown,
  status: number = 200
): () => Response {
  const json = JSON.stringify(data);
  const opts = selectJsonOpts(status);

  return () => new Response(json, opts);
}

export {
  TEXT_HEADERS,
  JSON_HEADERS,
  TEXT_200_OPTS,
  JSON_200_OPTS
};
