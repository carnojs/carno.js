import type { Context } from '../context/Context';

/**
 * Closure function to call the next middleware in the chain.
 */
export type CarnoClosure = () => void | Promise<void>;

/**
 * Interface for onion-style middleware.
 * Middleware must call next() to continue the chain.
 */
export interface CarnoMiddleware {
  handle(ctx: Context, next: CarnoClosure): void | Promise<void>;
}
