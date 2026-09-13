import { describe, expect, test } from 'bun:test';
import { Controller, Get, Query } from '@carno.js/core';
import { InProcessBus } from '../src/bus/InProcessBus';
import { resolveLiveConfig } from '../src/config';
import { Live } from '../src/decorators/Live';
import { DependencyGraph } from '../src/graph/DependencyGraph';
import { SubscriptionRegistry } from '../src/graph/SubscriptionRegistry';
import { LiveEngine, type LiveTransport } from '../src/LiveEngine';
import { dependencyContext } from '../src/resource/dependency-context';
import { ResourceRegistry } from '../src/resource/ResourceRegistry';
import type { ServerMessage } from '../src/shared/protocol';
import { directResourceExecutor } from './resource-registry-helper';

/**
 * Watches how many computes are in flight at once.
 *
 * Every compute runs the resource's route and so its queries, against a
 * database pool of ten by default. The engine used to start a whole slice of
 * five hundred at a time, which does not make them finish sooner -- the driver
 * queues the excess -- but does put hundreds of live queries in front of every
 * ordinary HTTP request waiting for the same pool.
 */
class Concurrency {
    current = 0;
    peak = 0;
    total = 0;

    async run<T>(work: () => Promise<T>): Promise<T> {
        this.current++;
        this.total++;
        this.peak = Math.max(this.peak, this.current);

        try {
            return await work();
        } finally {
            this.current--;
        }
    }

    reset(): void {
        this.current = 0;
        this.peak = 0;
        this.total = 0;
    }
}

const probe = new Concurrency();

@Controller('/probe')
class ProbeController {
    @Get('/')
    @Live({ shared: 'public' })
    async read(@Query('q') q?: string) {
        dependencyContext.current()?.add({ key: 'orm:probe', columns: null });

        // Asynchronous on purpose: a compute that never yields cannot overlap
        // another, and would make any limit look respected.
        return await probe.run(async () => {
            await new Promise(resolve => setTimeout(resolve, 1));
            return { q: q ?? '' };
        });
    }
}

class NullTransport implements LiveTransport {
    send(): number {
        return 1;
    }
}

function build(overrides: Record<string, unknown> = {}) {
    const resources = new ResourceRegistry();
    resources.register(ProbeController, new ProbeController(), directResourceExecutor);

    const bus = new InProcessBus();
    const engine = new LiveEngine(
        resources,
        new DependencyGraph(),
        new SubscriptionRegistry(),
        bus,
        new NullTransport(),
        resolveLiveConfig({ coalesceMs: 1, unsubGraceMs: 5000, ...overrides })
    );
    engine.start();

    return { engine, bus };
}

/** Subscribe `count` distinct instances of the one resource. */
async function subscribeMany(engine: LiveEngine, count: number): Promise<void> {
    const pending: Promise<void>[] = [];

    for (let i = 0; i < count; i++) {
        pending.push(engine.subscribe(
            'c1',
            `s${i}`,
            'ProbeController.read',
            { params: {}, query: { q: String(i) } },
            {}
        ));
    }

    await Promise.all(pending);
}

const settle = () => new Promise(resolve => setTimeout(resolve, 400));

describe('recompute concurrency', () => {
    test('a fan-out never runs more computes at once than the limit allows', async () => {
        const { engine, bus } = build({ maxConcurrentRecomputes: 3 });
        await subscribeMany(engine, 40);

        probe.reset();
        bus.publish([{ key: 'orm:probe', columns: null }]);
        await settle();

        expect(probe.peak).toBeLessThanOrEqual(3);
        // And every instance was still recomputed, not merely throttled away.
        expect(probe.total).toBe(40);
        expect(probe.current).toBe(0);
        engine.stop();
    });

    test('the limit holds across two flushes overlapping', async () => {
        const { engine, bus } = build({ maxConcurrentRecomputes: 2, coalesceMs: 1 });
        await subscribeMany(engine, 30);

        probe.reset();
        bus.publish([{ key: 'orm:probe', columns: null }]);
        // A second batch while the first is still draining: the cap belongs to
        // the engine, not to one flush, so two flushes cannot double it.
        await new Promise(resolve => setTimeout(resolve, 5));
        bus.publish([{ key: 'orm:probe', columns: null }]);
        await settle();

        expect(probe.peak).toBeLessThanOrEqual(2);
        expect(probe.current).toBe(0);
        engine.stop();
    });

    test('a burst of first subscriptions is bounded too', async () => {
        const { engine } = build({ maxConcurrentRecomputes: 3 });

        probe.reset();
        await subscribeMany(engine, 25);

        // createInstance runs the same query against the same pool; leaving it
        // out would have left the cap open on the path a deploy hits hardest.
        expect(probe.peak).toBeLessThanOrEqual(3);
        expect(probe.total).toBe(25);
        engine.stop();
    });

    test('the default keeps room in the pool for ordinary requests', () => {
        // Bun's SQL pool defaults to ten connections. A default at or above
        // that would let a fan-out take every one of them.
        expect(resolveLiveConfig().maxConcurrentRecomputes).toBeLessThan(10);
    });

    test('stopping releases whoever was queued for a permit', async () => {
        const { engine, bus } = build({ maxConcurrentRecomputes: 1 });
        await subscribeMany(engine, 12);

        probe.reset();
        bus.publish([{ key: 'orm:probe', columns: null }]);
        await new Promise(resolve => setTimeout(resolve, 3));
        engine.stop();
        await settle();

        // Nothing is left holding a permit or waiting for one forever.
        expect(probe.current).toBe(0);
        expect(probe.total).toBe(12);

        // And the permit accounting balanced, so restarting still bounds.
        probe.reset();
        engine.start();
        bus.publish([{ key: 'orm:probe', columns: null }]);
        await settle();

        expect(probe.peak).toBeLessThanOrEqual(1);
        engine.stop();
    });
});
