/**
 * MIME type mappings for common file extensions.
 * Performance: Static object lookup is O(1).
 */
const MIME_TYPES: Record<string, string> = {
    // Text
    '.html': 'text/html; charset=utf-8',
    '.htm': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.xml': 'application/xml',

    // JavaScript
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.json': 'application/json',

    // Images
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.avif': 'image/avif',

    // Fonts
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.eot': 'application/vnd.ms-fontobject',

    // Media
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',

    // Documents
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
    '.gzip': 'application/gzip',
    '.gz': 'application/gzip',
    '.tar': 'application/x-tar',

    // Source maps
    '.map': 'application/json',

    // WebAssembly
    '.wasm': 'application/wasm',
};

/**
 * Get MIME type for a file path.
 * Uses lastIndexOf for performance (no path.extname overhead).
 */
export function getMimeType(filePath: string): string {
    const lastDot = filePath.lastIndexOf('.');
    if (lastDot === -1) return 'application/octet-stream';

    const ext = filePath.slice(lastDot).toLowerCase();
    return MIME_TYPES[ext] || 'application/octet-stream';
}
