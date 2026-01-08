/**
 * Carno Turbo - Ultra-Fast HTTP Framework
 * 
 * Design principles:
 * 1. ZERO abstraction at runtime - everything compiled at startup
 * 2. Direct Bun.serve() with native routes
 * 3. JIT compiled handlers with AOT async detection
 * 4. No intermediate layers in hot path
 * 5. Radix tree router for dynamic routes
 */

// Application
export { Turbo } from './Turbo';
export type { MiddlewareHandler, TurboConfig } from './Turbo';

// Context
export { Context } from './context/Context';

// Decorators - Controller
export { Controller } from './decorators/Controller';

// Decorators - HTTP Methods
export { Get, Post, Put, Delete, Patch, Head, Options } from './decorators/methods';

// Decorators - Parameters
export { Param, Query, Body, Header, Req, Ctx } from './decorators/params';

// Decorators - Middleware
export { Use } from './decorators/Middleware';

// Decorators - DI
export { Service } from './decorators/Service';
export { Inject } from './decorators/Inject';

// Container
export { Container, Scope } from './container/Container';
export type { Token, ProviderConfig } from './container/Container';

// Router
export { RadixRouter } from './router/RadixRouter';
export type { RouteMatch } from './router/RadixRouter';
