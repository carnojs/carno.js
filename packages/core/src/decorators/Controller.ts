import { CONTROLLER_META, ROUTES_META } from '../metadata';
import type { ControllerOptions, ControllerMeta } from '../metadata';

/**
 * Normalizes path or options to ControllerOptions.
 */
function normalizeOptions(pathOrOptions?: string | ControllerOptions): ControllerOptions {
    if (!pathOrOptions) {
        return {};
    }

    if (typeof pathOrOptions === 'string') {
        return { path: pathOrOptions };
    }

    return pathOrOptions;
}

/**
 * Normalizes a path to start with / and not end with /.
 */
function normalizePath(path: string): string {
    if (!path) return '';

    let normalized = path.startsWith('/') ? path : '/' + path;

    if (normalized !== '/' && normalized.endsWith('/')) {
        normalized = normalized.slice(0, -1);
    }

    return normalized;
}

/**
 * Marks a class as a controller with a base path.
 *
 * @example
 * // Simple path
 * @Controller('/users')
 *
 * @example
 * // With options
 * @Controller({ path: '/users', children: [ProfileController] })
 */
export function Controller(pathOrOptions?: string | ControllerOptions): ClassDecorator {
    return (target) => {
        const options = normalizeOptions(pathOrOptions);
        const path = normalizePath(options.path || '');

        const meta: ControllerMeta = {
            path,
            scope: options.scope,
            children: options.children
        };

        Reflect.defineMetadata(CONTROLLER_META, meta, target);

        // Ensure routes array exists
        if (!Reflect.hasMetadata(ROUTES_META, target)) {
            Reflect.defineMetadata(ROUTES_META, [], target);
        }
    };
}
