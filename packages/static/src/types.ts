/**
 * Static file plugin configuration.
 */
export interface StaticPluginConfig {
    /** Directory to serve files from (default: 'public') */
    root?: string;

    /** URL prefix for static files (default: '/') */
    prefix?: string;

    /** Index file(s) to serve for directories (default: 'index.html') */
    index?: string | string[];

    /** Cache-Control header value (default: 'public, max-age=3600') */
    cacheControl?: string | false;

    /** Enable SPA mode - fallback to index.html (default: false) */
    spa?: boolean;

    /** Serve dotfiles (default: false) */
    dotFiles?: boolean;

    /** Allowed file extensions (default: all) */
    extensions?: string[];

    /** 
     * Pre-load all files as static routes (default: NODE_ENV === 'production')
     * - true: Register individual routes for each file (zero I/O at runtime)
     * - false: Use wildcard route with on-demand loading
     */
    alwaysStatic?: boolean;

    /** Maximum files to pre-load in static mode (default: 1024) */
    staticLimit?: number;

    /** Patterns to ignore (default: ['.DS_Store', '.git', '.env']) */
    ignorePatterns?: (string | RegExp)[];
}

export interface ResolvedConfig extends Required<StaticPluginConfig> {
    ignorePatterns: (string | RegExp)[];
}
