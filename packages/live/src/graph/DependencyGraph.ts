import { ancestorsOf, type DepKey } from './dep-key';
import type { Dependency, InvalidationEvent } from './types';

/** Column sets registered per instance under one key. null means wildcard. */
type ColumnSet = Set<string> | null;

/**
 * Key ↔ instance index with ancestor resolution and column filtering.
 *
 * Knows nothing about WebSocket, the ORM, or resources — it is a pure data
 * structure, which is why the hard part of invalidation is testable without
 * a server, a database or a socket.
 */
export class DependencyGraph {
    private readonly byKey = new Map<DepKey, Map<string, ColumnSet>>();
    private readonly byInstance = new Map<string, Set<DepKey>>();
    /**
     * Registered row keys grouped by the key that contains them, so a write
     * that names a whole table finds its rows instead of being searched for.
     *
     * Without it, resolving a table event means walking every key in the
     * graph: at the configured `maxInstancesPerNode` that is a five-millisecond
     * scan, run synchronously once per event of the batch, with every HTTP
     * request in the process waiting behind it. Table events are not the rare
     * case either -- a write degrades to its table key unless its WHERE clause
     * is a literal primary-key match.
     */
    private readonly byParent = new Map<DepKey, Set<Map<string, ColumnSet>>>();

    /** Replace every dependency held by this instance. */
    setDependencies(instanceId: string, deps: Dependency[]): void {
        this.remove(instanceId);

        if (deps.length === 0) {
            return;
        }

        const keys = new Set<DepKey>();

        for (const dep of deps) {
            keys.add(dep.key);

            let holders = this.byKey.get(dep.key);
            if (!holders) {
                holders = new Map<string, ColumnSet>();
                this.byKey.set(dep.key, holders);
                this.index(dep.key, holders);
            }

            if (!holders.has(instanceId)) {
                holders.set(instanceId, dep.columns === null ? null : new Set(dep.columns));
                continue;
            }

            const existing = holders.get(instanceId)!;

            if (existing === null) {
                continue;
            }

            if (dep.columns === null) {
                holders.set(instanceId, null);
                continue;
            }

            for (const column of dep.columns) {
                existing.add(column);
            }
        }

        this.byInstance.set(instanceId, keys);
    }

    /** Forget the instance entirely. */
    remove(instanceId: string): void {
        const keys = this.byInstance.get(instanceId);

        if (!keys) {
            return;
        }

        for (const key of keys) {
            const holders = this.byKey.get(key);

            if (!holders) {
                continue;
            }

            holders.delete(instanceId);

            if (holders.size === 0) {
                this.byKey.delete(key);
                this.unindex(key, holders);
            }
        }

        this.byInstance.delete(instanceId);
    }

    /**
     * Instances concerned by this write.
     *
     * Both directions of the hierarchy matter. A row write wakes table
     * subscribers, while a table write wakes row subscribers because a
     * predicate write may have touched that row.
     */
    resolve(event: InvalidationEvent): string[] {
        const matched = new Set<string>();

        for (const key of ancestorsOf(event.key)) {
            this.collect(key, event.columns, matched);
        }

        // A key with a `#` is already a row: it has no descendants, and the
        // ancestor pass above has covered its table.
        if (!event.key.includes('#')) {
            const rows = this.byParent.get(event.key);

            if (rows) {
                // Holder maps, not keys: the key would only be looked up again.
                for (const holders of rows) {
                    this.collectFrom(holders, event.columns, matched);
                }
            }
        }

        return [...matched];
    }

    keyCount(): number {
        return this.byKey.size;
    }

    instanceCount(): number {
        return this.byInstance.size;
    }

    /** Keys that currently hold indexed rows. Zero when the graph is empty. */
    parentCount(): number {
        return this.byParent.size;
    }

    /**
     * Record a row key's holders under the key that contains it.
     *
     * A table key has no separator and so no parent; it is reached directly.
     * The holder map is stored rather than the key because it is what
     * `resolve` actually needs, and because its identity is stable: it is
     * created once in `setDependencies` and dropped only in `remove`.
     */
    private index(key: DepKey, holders: Map<string, ColumnSet>): void {
        const separator = key.indexOf('#');

        if (separator === -1) {
            return;
        }

        const parent = key.slice(0, separator);
        let rows = this.byParent.get(parent);

        if (!rows) {
            rows = new Set<Map<string, ColumnSet>>();
            this.byParent.set(parent, rows);
        }

        rows.add(holders);
    }

    private unindex(key: DepKey, holders: Map<string, ColumnSet>): void {
        const separator = key.indexOf('#');

        if (separator === -1) {
            return;
        }

        const parent = key.slice(0, separator);
        const rows = this.byParent.get(parent);

        if (!rows) {
            return;
        }

        rows.delete(holders);

        if (rows.size === 0) {
            this.byParent.delete(parent);
        }
    }

    private collect(key: DepKey, writtenColumns: string[] | null, into: Set<string>): void {
        const holders = this.byKey.get(key);

        if (holders) {
            this.collectFrom(holders, writtenColumns, into);
        }
    }

    private collectFrom(
        holders: Map<string, ColumnSet>,
        writtenColumns: string[] | null,
        into: Set<string>
    ): void {
        for (const [instanceId, readColumns] of holders) {
            if (intersects(readColumns, writtenColumns)) {
                into.add(instanceId);
            }
        }
    }
}

function intersects(readColumns: Set<string> | null, writtenColumns: string[] | null): boolean {
    if (readColumns === null || writtenColumns === null) {
        return true;
    }

    for (const column of writtenColumns) {
        if (readColumns.has(column)) {
            return true;
        }
    }

    return false;
}
