/**
 * Lightweight DI Container for Turbo.
 * 
 * Features:
 * - Constructor injection via reflect-metadata
 * - Singleton scope by default
 * - Request scope support
 * - Lazy instantiation
 */

export type Token<T = any> = new (...args: any[]) => T;

export enum Scope {
    SINGLETON = 'singleton', // Always the same instance
    REQUEST = 'request',     // New instance per request
    INSTANCE = 'instance'    // New instance per dependency injection
}

export interface ProviderConfig<T = any> {
    token: Token<T>;
    useClass?: Token<T>;
    useValue?: T;
    scope?: Scope;
}

interface ProviderEntry {
    config: ProviderConfig;
    instance: any | null;
}

export class Container {
    private configs = new Map<Token, ProviderConfig>();
    private instances = new Map<Token, any>();
    private resolving = new Set<Token>();

    register<T>(config: ProviderConfig<T> | Token<T>): this {
        const normalized = this.normalizeConfig(config);

        this.configs.set(normalized.token, normalized);

        if (normalized.useValue !== undefined) {
            this.instances.set(normalized.token, normalized.useValue);
        }

        return this;
    }

    get<T>(token: Token<T>): T {
        const cached = this.instances.get(token);

        if (cached !== undefined) {
            return cached;
        }

        return this.resolve(token);
    }

    has(token: Token): boolean {
        return this.configs.has(token);
    }

    private resolve<T>(token: Token<T>, requestLocals?: Map<Token, any>): T {
        if (requestLocals?.has(token)) {
            return requestLocals.get(token);
        }

        const cached = this.instances.get(token);

        if (cached !== undefined) {
            return cached;
        }

        const config = this.configs.get(token);

        if (!config) {
            throw new Error(`Provider not found: ${token.name}`);
        }

        const instance = this.createInstance(config, requestLocals);

        // SINGLETON: cache globally
        // REQUEST: cache in request locals
        // INSTANCE: never cache - always create new
        if (config.scope === Scope.SINGLETON) {
            this.instances.set(token, instance);
        } else if (config.scope === Scope.REQUEST && requestLocals) {
            requestLocals.set(token, instance);
        }
        // INSTANCE scope: do not cache

        return instance;
    }

    private createInstance(config: ProviderConfig, requestLocals?: Map<Token, any>): any {
        const target = config.useClass ?? config.token;

        if (this.resolving.has(target)) {
            throw new Error(`Circular dependency detected: ${target.name}`);
        }

        this.resolving.add(target);

        try {
            const deps = this.getDependencies(target);

            if (deps.length === 0) {
                return new target();
            }

            const args = deps.map(dep => this.resolve(dep, requestLocals));

            return new target(...args);
        } finally {
            this.resolving.delete(target);
        }
    }

    private getDependencies(target: Token): Token[] {
        const types = Reflect.getMetadata('design:paramtypes', target) || [];

        return types.filter((t: any) => t && typeof t === 'function');
    }

    private normalizeConfig<T>(config: ProviderConfig<T> | Token<T>): ProviderConfig<T> {
        if (typeof config === 'function') {
            return {
                token: config,
                useClass: config,
                scope: Scope.SINGLETON
            };
        }

        return {
            ...config,
            useClass: config.useClass ?? config.token,
            scope: config.scope ?? Scope.SINGLETON
        };
    }

    clear(): void {
        this.configs.clear();
        this.instances.clear();
    }
}
