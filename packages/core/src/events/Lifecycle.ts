/**
 * Lifecycle Event Types.
 */
export enum EventType {
    /** Called when DI container initializes, before server starts */
    INIT = 'onInit',
    /** Called right after application is fully bootstrapped */
    BOOT = 'onBoot',
    /** Called when application receives SIGTERM/SIGINT */
    SHUTDOWN = 'onShutdown'
}

/**
 * Stored event handler info.
 */
export interface EventHandler {
    target: any;
    methodName: string;
    priority: number;
}

/**
 * Metadata key for storing events.
 */
export const EVENTS_META = Symbol('turbo:events');

/**
 * Event registry - stores all decorated event handlers.
 * Populated at decoration time, read at bootstrap.
 */
const eventRegistry = new Map<EventType, EventHandler[]>();

/**
 * Register an event handler (called by decorators).
 */
export function registerEvent(type: EventType, target: any, methodName: string, priority: number = 0): void {
    let handlers = eventRegistry.get(type);
    if (!handlers) {
        handlers = [];
        eventRegistry.set(type, handlers);
    }
    handlers.push({ target, methodName, priority });
}

/**
 * Get all handlers for an event type, sorted by priority (descending).
 */
export function getEventHandlers(type: EventType): EventHandler[] {
    const handlers = eventRegistry.get(type) || [];
    return handlers.sort((a, b) => b.priority - a.priority);
}

/**
 * Check if any handlers exist for an event type.
 */
export function hasEventHandlers(type: EventType): boolean {
    return (eventRegistry.get(type)?.length ?? 0) > 0;
}

/**
 * Clear all event handlers (for testing).
 */
export function clearEventRegistry(): void {
    eventRegistry.clear();
}

// ============ Decorators ============

/**
 * Called when DI container initializes, before the server starts.
 * Use for database connections, cache warming, etc.
 */
export function OnApplicationInit(priority: number = 0) {
    return function (target: any, propertyKey: string) {
        registerEvent(EventType.INIT, target.constructor, propertyKey, priority);
    };
}

/**
 * Called right after the application is fully bootstrapped and server is ready.
 * Use for logging, health checks, etc.
 */
export function OnApplicationBoot(priority: number = 0) {
    return function (target: any, propertyKey: string) {
        registerEvent(EventType.BOOT, target.constructor, propertyKey, priority);
    };
}

/**
 * Called when application receives SIGTERM or SIGINT.
 * Use for graceful cleanup, closing connections, etc.
 */
export function OnApplicationShutdown(priority: number = 0) {
    return function (target: any, propertyKey: string) {
        registerEvent(EventType.SHUTDOWN, target.constructor, propertyKey, priority);
    };
}
