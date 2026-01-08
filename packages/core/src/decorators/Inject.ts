import { INJECT_META } from '../metadata';
import type { Token } from '../container/Container';

/**
 * Explicitly specifies which token to inject.
 * Useful for interfaces or when automatic detection fails.
 */
export function Inject(token: Token): ParameterDecorator {
    return (target, propertyKey, parameterIndex) => {
        const existing: Map<number, Token> = Reflect.getMetadata(INJECT_META, target) || new Map();

        existing.set(parameterIndex, token);

        Reflect.defineMetadata(INJECT_META, existing, target);
    };
}
