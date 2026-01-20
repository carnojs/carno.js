/**
 * @carno.js/static - Static file serving for Carno.js
 *
 * Performance-focused static file plugin with two strategies:
 * - Production: Pre-load all files as individual static routes
 * - Development: On-demand serving with wildcard route
 *
 * @example
 * ```ts
 * import { Carno } from '@carno.js/core';
 * import { StaticPlugin } from '@carno.js/static';
 *
 * const app = new Carno();
 * app.use(await StaticPlugin.create({ root: './public' }));
 * app.listen(3000);
 * ```
 */

export { StaticPlugin } from './StaticPlugin';
export { StaticController } from './StaticController';
export { getMimeType } from './MimeTypes';
export { STATIC_CONFIG_TOKEN, setStaticConfig, getStaticConfig } from './config';
export type { StaticPluginConfig, ResolvedConfig } from './types';
