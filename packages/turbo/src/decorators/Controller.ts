import { CONTROLLER_META, ROUTES_META } from '../metadata';

/**
 * Marks a class as a controller with a base path.
 */
export function Controller(basePath: string = ''): ClassDecorator {
    return (target) => {
        // Normalize path
        const path = basePath.startsWith('/') ? basePath : '/' + basePath;
        Reflect.defineMetadata(CONTROLLER_META, path, target);

        // Ensure routes array exists
        if (!Reflect.hasMetadata(ROUTES_META, target)) {
            Reflect.defineMetadata(ROUTES_META, [], target);
        }
    };
}
