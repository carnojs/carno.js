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
  preflightContinue?: boolean;
}

export const DEFAULT_CORS_METHODS = [
  "GET",
  "HEAD",
  "PUT",
  "PATCH",
  "POST",
  "DELETE",
];

export const DEFAULT_CORS_ALLOWED_HEADERS = [
  "Content-Type",
  "Authorization",
  "X-Requested-With",
  "Accept",
  "Origin",
];
