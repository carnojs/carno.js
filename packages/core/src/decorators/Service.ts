import { SERVICE_META } from '../metadata';
import { Scope } from '../container/Container';

export interface ServiceOptions {
    scope?: Scope;
}

/**
 * Marks a class as an injectable service.
 * Services are singleton by default.
 */
export function Service(options: ServiceOptions = {}): ClassDecorator {
    return (target) => {
        Reflect.defineMetadata(SERVICE_META, {
            scope: options.scope ?? Scope.SINGLETON
        }, target);
    };
}
