import { describe, expect, test } from 'bun:test';
import { DependencyGraph } from '../src/graph/DependencyGraph';
import type { Dependency, InvalidationEvent } from '../src/graph/types';

/**
 * `resolve` used to answer a table event by scanning every key in the graph
 * with `startsWith`. The scan was replaced by an index, and an index can be
 * wrong in two ways the old code could not: a missed insert silently drops an
 * invalidation, and a missed delete silently leaks memory. Both are checked
 * here against a model of the graph kept outside it.
 */
class Model {
    private readonly deps = new Map<string, Dependency[]>();

    set(instanceId: string, deps: Dependency[]): void {
        if (deps.length === 0) {
            this.deps.delete(instanceId);
            return;
        }

        this.deps.set(instanceId, deps);
    }

    remove(instanceId: string): void {
        this.deps.delete(instanceId);
    }

    /** The same answer, worked out by the rule rather than by an index. */
    resolve(event: InvalidationEvent): string[] {
        const separator = event.key.indexOf('#');
        const table = separator === -1 ? null : event.key.slice(0, separator);
        const descendantPrefix = `${event.key}#`;
        const matched: string[] = [];

        for (const [instanceId, deps] of this.deps) {
            for (const key of new Set(deps.map(dep => dep.key))) {
                const concerned = key === event.key
                    || key === table
                    || (separator === -1 && key.startsWith(descendantPrefix));

                if (concerned && intersects(columnsFor(deps, key), event.columns)) {
                    matched.push(instanceId);
                    break;
                }
            }
        }

        return matched;
    }
}

/** Mirrors how setDependencies merges repeated deps: null wins, else union. */
function columnsFor(deps: Dependency[], key: string): string[] | null {
    const union = new Set<string>();

    for (const dep of deps) {
        if (dep.key !== key) {
            continue;
        }

        if (dep.columns === null) {
            return null;
        }

        for (const column of dep.columns) {
            union.add(column);
        }
    }

    return [...union];
}

function intersects(read: string[] | null, written: string[] | null): boolean {
    if (read === null || written === null) {
        return true;
    }

    return written.some(column => read.includes(column));
}

function agree(graph: DependencyGraph, model: Model, event: InvalidationEvent): void {
    expect(graph.resolve(event).sort()).toEqual(model.resolve(event).sort());
}

/** Deterministic PRNG, so a failure is reproducible from its seed alone. */
function rng(seed: number): () => number {
    let state = seed >>> 0;

    return () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 0x100000000;
    };
}

const TABLES = ['orm:users', 'orm:tasks', 'orm:user', 'app:poc:tasks'];
const COLUMNS = [null, ['id'], ['id', 'name'], ['name'], ['last_seen_at']];

describe('the table-event index answers exactly what the scan answered', () => {
    test('on a table whose name is a prefix of another', () => {
        const graph = new DependencyGraph();
        graph.setDependencies('user-row', [{ key: 'orm:user#1', columns: null }]);
        graph.setDependencies('users-row', [{ key: 'orm:users#1', columns: null }]);

        // `orm:users#1`.startsWith('orm:user#') is false, and the index must
        // agree: the parent of that key is `orm:users`, not `orm:user`.
        expect(graph.resolve({ key: 'orm:user', columns: null })).toEqual(['user-row']);
        expect(graph.resolve({ key: 'orm:users', columns: null })).toEqual(['users-row']);
    });

    test('on a row id that itself contains the separator', () => {
        const graph = new DependencyGraph();
        graph.setDependencies('odd', [{ key: 'orm:users#4#2', columns: null }]);

        expect(graph.resolve({ key: 'orm:users', columns: null })).toEqual(['odd']);
        expect(graph.resolve({ key: 'orm:users#4', columns: null })).toEqual([]);
    });

    test('on a manual dependsOn key outside the orm namespace', () => {
        const graph = new DependencyGraph();
        graph.setDependencies('scoped', [{ key: 'app:poc:tasks#7', columns: null }]);

        expect(graph.resolve({ key: 'app:poc:tasks', columns: null })).toEqual(['scoped']);
    });

    test('still filters by column on the descendants it now finds by index', () => {
        const graph = new DependencyGraph();
        graph.setDependencies('detail', [{ key: 'orm:users#42', columns: ['id', 'name'] }]);

        expect(graph.resolve({ key: 'orm:users', columns: ['last_seen_at'] })).toEqual([]);
        expect(graph.resolve({ key: 'orm:users', columns: ['name'] })).toEqual(['detail']);
    });

    test('drops a row from the table event once its last holder is gone', () => {
        const graph = new DependencyGraph();
        graph.setDependencies('a', [{ key: 'orm:users#42', columns: null }]);
        graph.setDependencies('b', [{ key: 'orm:users#42', columns: null }]);

        graph.remove('a');
        expect(graph.resolve({ key: 'orm:users', columns: null })).toEqual(['b']);

        graph.remove('b');
        expect(graph.resolve({ key: 'orm:users', columns: null })).toEqual([]);
    });

    test('follows an instance that moves from one row to another', () => {
        const graph = new DependencyGraph();
        graph.setDependencies('i', [{ key: 'orm:users#1', columns: null }]);
        graph.setDependencies('i', [{ key: 'orm:users#2', columns: null }]);

        expect(graph.resolve({ key: 'orm:users#1', columns: null })).toEqual([]);
        expect(graph.resolve({ key: 'orm:users#2', columns: null })).toEqual(['i']);
        expect(graph.resolve({ key: 'orm:users', columns: null })).toEqual(['i']);
    });

    test('under 3000 random writes and removals across 6 seeds', () => {
        for (let seed = 1; seed <= 6; seed++) {
            const next = rng(seed * 7919);
            const graph = new DependencyGraph();
            const model = new Model();
            const live: string[] = [];

            for (let step = 0; step < 500; step++) {
                const instanceId = `i${Math.floor(next() * 40)}`;

                if (live.includes(instanceId) && next() < 0.3) {
                    graph.remove(instanceId);
                    model.remove(instanceId);
                    live.splice(live.indexOf(instanceId), 1);
                } else {
                    const deps: Dependency[] = [];
                    const count = 1 + Math.floor(next() * 3);

                    for (let d = 0; d < count; d++) {
                        const table = TABLES[Math.floor(next() * TABLES.length)];
                        const row = next() < 0.7 ? `#${Math.floor(next() * 12)}` : '';
                        deps.push({
                            key: `${table}${row}`,
                            columns: COLUMNS[Math.floor(next() * COLUMNS.length)]
                        });
                    }

                    graph.setDependencies(instanceId, deps);
                    model.set(instanceId, deps);
                    if (!live.includes(instanceId)) {
                        live.push(instanceId);
                    }
                }

                for (const table of TABLES) {
                    agree(graph, model, { key: table, columns: null });
                    agree(graph, model, { key: table, columns: ['name'] });
                    agree(graph, model, { key: `${table}#${Math.floor(next() * 12)}`, columns: null });
                }
            }

            // Every instance removed must leave the graph empty, index included.
            for (const instanceId of [...live]) {
                graph.remove(instanceId);
            }

            expect(graph.instanceCount()).toBe(0);
            expect(graph.keyCount()).toBe(0);
            expect(graph.parentCount()).toBe(0);
        }
    });
});
