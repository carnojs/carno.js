/**
 * Deterministic JSON canonicalization, shared verbatim by client and server.
 *
 * Both sides MUST produce byte-identical output for the same logical value:
 * the instance id and the content hash are derived from it, so a divergence
 * silently breaks subscription dedupe and the hydration handshake instead of
 * failing loudly.
 *
 * It also runs on every recompute, over the whole payload, which makes it the
 * most expensive step of a recompute that changes nothing. Building the string
 * in JavaScript loses to `JSON.stringify` by roughly an order of magnitude, so
 * the common case does not build it: one walk normalizes the value into the
 * shape `JSON.stringify` would already render canonically -- keys sorted,
 * nothing unserializable left in it -- and the native serializer does the rest.
 *
 * What that walk has to do, and `JSON.stringify` cannot:
 *
 * - order object keys, which is the whole point;
 * - refuse values with no agreed wire form, which `JSON.stringify` accepts
 *   silently (a Date becomes a string, a Map becomes `{}`, a NaN becomes null).
 *
 * What it deliberately leaves to `JSON.stringify`, which already agrees:
 * string escaping, number formatting including negative zero, dropping
 * undefined properties, and rendering an array hole as null.
 *
 * The escape hatch is `writeCanonical` below. A JavaScript object cannot hold
 * an integer-like key anywhere but the front -- `{ '': 1, '1': 2 }` always
 * enumerates as `1` then `''` -- so an object carrying one cannot be emitted
 * in lexicographic order at all. Those values fall back to building the string
 * here, where the order is ours to choose. Both paths are held to the same
 * output by the differential test.
 */
export class NonSerializableInputError extends Error {
    constructor(
        public readonly path: string,
        public readonly received: string
    ) {
        super(`Live input at "${path}" is not serializable (received ${received}).`);
        this.name = 'NonSerializableInputError';
    }
}

/** Thrown by the fast path to hand the value to `writeCanonical` instead. */
const INDEX_KEY = Symbol('carno:live:index-key');

/**
 * The last key list seen, with its sorted form.
 *
 * Every row of a collection carries the same keys in the same order, so one
 * sort serves the whole list: comparing the key arrays element-wise is a run
 * of interned-string pointer comparisons, far cheaper than sorting again. It
 * is a memo and nothing else -- a miss costs a sort, never a wrong answer --
 * and the pair is replaced in a single assignment so a reentrant walk can
 * never observe keys from one object beside the sorted keys of another.
 */
let shape: { keys: string[]; sorted: string[] } = { keys: [], sorted: [] };

function sortedKeysOf(value: object): string[] {
    const keys = Object.keys(value);
    const memo = shape;

    if (keys.length === memo.keys.length) {
        let same = true;

        for (let i = 0; i < keys.length; i++) {
            if (keys[i] !== memo.keys[i]) {
                same = false;
                break;
            }
        }

        if (same) {
            return memo.sorted;
        }
    }

    const sorted = keys.slice().sort();
    shape = { keys, sorted };

    return sorted;
}

/**
 * True for any key an object might reorder: every array index starts with a
 * digit. Deliberately coarse -- `'1abc'` is not an index but is treated as
 * one -- because the only cost of a false positive is taking the slow path,
 * and the check runs once per key on the hot path. An empty key yields NaN,
 * which fails both comparisons, and is correctly not an index.
 */
function mayReorder(key: string): boolean {
    const first = key.charCodeAt(0);

    return first >= 48 && first <= 57;
}

/** Assemble `$.filters[0].since` from the walk's segment stack, on throw only. */
function pathOf(root: string, segments: (string | number)[]): string {
    let path = root;

    for (const segment of segments) {
        path += typeof segment === 'number' ? `[${segment}]` : `.${segment}`;
    }

    return path;
}

export function canonical(value: unknown, path: string = '$'): string {
    try {
        // `normalize` never yields undefined, so this never yields undefined.
        return JSON.stringify(normalize(value, [], path)) as string;
    } catch (error) {
        if (error !== INDEX_KEY) {
            throw error;
        }
    }

    const chunks: string[] = [];
    writeCanonical(value, chunks, [], path);

    return chunks.join('');
}

/**
 * Rebuild `value` as the equivalent JSON value with every object's keys in
 * sorted order, rejecting anything that has no canonical wire form.
 */
function normalize(
    value: unknown,
    segments: (string | number)[],
    root: string
): unknown {
    if (value === null || value === undefined) {
        return null;
    }

    switch (typeof value) {
        case 'boolean':
        case 'string':
            return value;
        case 'number':
            if (!Number.isFinite(value)) {
                throw new NonSerializableInputError(pathOf(root, segments), String(value));
            }
            // Negative zero needs no special case: JSON.stringify renders it
            // as `0`, which is what a query means by it.
            return value;
        case 'bigint':
        case 'function':
        case 'symbol':
            throw new NonSerializableInputError(pathOf(root, segments), typeof value);
    }

    if (Array.isArray(value)) {
        const out = new Array(value.length);

        for (let index = 0; index < value.length; index++) {
            segments.push(index);
            // Reading by index turns a hole into undefined, and so into null,
            // which is what JSON.stringify would have rendered for the hole.
            out[index] = normalize(value[index], segments, root);
            segments.pop();
        }

        return out;
    }

    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
        // Date, Map, Set, class instances: no agreed wire form, so refuse
        // rather than guess one the client would canonicalize differently.
        const name = (value as object).constructor?.name ?? 'object';
        throw new NonSerializableInputError(pathOf(root, segments), name);
    }

    const keys = sortedKeysOf(value as object);
    // A literal, so the result never carries a prototype, a toJSON, or the
    // insertion order of the value it came from.
    const out: Record<string, unknown> = {};

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];

        if (mayReorder(key)) {
            throw INDEX_KEY;
        }

        const item = (value as Record<string, unknown>)[key];

        if (item === undefined) {
            continue;
        }

        segments.push(key);
        out[key] = normalize(item, segments, root);
        segments.pop();
    }

    return out;
}

/**
 * Printable ASCII minus the only two characters JSON escapes in that range:
 * `"` (0x22) and `\` (0x5c). A string that matches needs no escaping at all,
 * so it can be quoted by concatenation. Anything else -- control characters,
 * quotes, backslashes, non-ASCII, lone surrogates -- falls back to
 * `JSON.stringify`, which keeps the output exact rather than merely fast.
 */
const NO_ESCAPES = /^[\x20-\x21\x23-\x5b\x5d-\x7e]*$/;

function quote(value: string): string {
    return NO_ESCAPES.test(value) ? `"${value}"` : JSON.stringify(value);
}

/**
 * The order-preserving path, for values `normalize` cannot express.
 *
 * Held to the same output as the fast path by the differential test, which is
 * what keeps the two from drifting apart.
 */
function writeCanonical(
    value: unknown,
    chunks: string[],
    segments: (string | number)[],
    root: string
): void {
    if (value === null || value === undefined) {
        chunks.push('null');
        return;
    }

    switch (typeof value) {
        case 'boolean':
            chunks.push(value ? 'true' : 'false');
            return;
        case 'number':
            if (!Number.isFinite(value)) {
                throw new NonSerializableInputError(pathOf(root, segments), String(value));
            }
            // -0 and 0 are the same input as far as a query is concerned.
            chunks.push(Object.is(value, -0) ? '0' : String(value));
            return;
        case 'string':
            chunks.push(quote(value));
            return;
        case 'bigint':
        case 'function':
        case 'symbol':
            throw new NonSerializableInputError(pathOf(root, segments), typeof value);
    }

    if (Array.isArray(value)) {
        chunks.push('[');

        for (let index = 0; index < value.length; index++) {
            if (index > 0) {
                chunks.push(',');
            }

            segments.push(index);
            writeCanonical(value[index], chunks, segments, root);
            segments.pop();
        }

        chunks.push(']');
        return;
    }

    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
        const name = (value as object).constructor?.name ?? 'object';
        throw new NonSerializableInputError(pathOf(root, segments), name);
    }

    const keys = sortedKeysOf(value as object);

    chunks.push('{');

    let first = true;

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const item = (value as Record<string, unknown>)[key];

        if (item === undefined) {
            continue;
        }

        if (!first) {
            chunks.push(',');
        }

        first = false;
        chunks.push(quote(key), ':');

        segments.push(key);
        writeCanonical(item, chunks, segments, root);
        segments.pop();
    }

    chunks.push('}');
}
