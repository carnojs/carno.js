import { describe, expect, test } from 'bun:test';
import { canonical, NonSerializableInputError } from '../src/shared/canonical';

/**
 * The implementation that shipped before the rewrite, kept verbatim as an
 * oracle. `canonical` feeds the instance id and the content hash, and client
 * and server derive them independently, so a byte of drift breaks subscription
 * dedupe and the hydration handshake without raising anything. Asserting
 * equality against the previous implementation is the only check that covers
 * that; hand-written expectations only cover what we thought of.
 */
function reference(value: unknown, path: string = '$'): string {
    if (value === null || value === undefined) {
        return 'null';
    }

    switch (typeof value) {
        case 'boolean':
            return value ? 'true' : 'false';
        case 'number':
            if (!Number.isFinite(value)) {
                throw new NonSerializableInputError(path, String(value));
            }
            return Object.is(value, -0) ? '0' : String(value);
        case 'string':
            return JSON.stringify(value);
        case 'bigint':
        case 'function':
        case 'symbol':
            throw new NonSerializableInputError(path, typeof value);
    }

    if (Array.isArray(value)) {
        // Index reads, not `.map()`: the implementation this replaced skipped
        // holes and joined them into `[,1]`, which is not JSON. A hole is
        // undefined, and canonical renders undefined as null.
        const items: string[] = [];

        for (let index = 0; index < value.length; index++) {
            items.push(reference(value[index], `${path}[${index}]`));
        }

        return `[${items.join(',')}]`;
    }

    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
        const name = (value as object).constructor?.name ?? 'object';
        throw new NonSerializableInputError(path, name);
    }

    const entries = Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));

    const body = entries
        .map(([key, item]) => `${JSON.stringify(key)}:${reference(item, `${path}.${key}`)}`)
        .join(',');

    return `{${body}}`;
}

/** Compare both implementations on a value: the output, or the thrown error. */
function agree(value: unknown): void {
    let expected: { ok: true; text: string } | { ok: false; path: string; received: string };

    try {
        expected = { ok: true, text: reference(value) };
    } catch (error) {
        const failure = error as NonSerializableInputError;
        expected = { ok: false, path: failure.path, received: failure.received };
    }

    if (expected.ok) {
        expect(canonical(value)).toBe(expected.text);
        return;
    }

    let thrown: unknown;

    try {
        canonical(value);
    } catch (error) {
        thrown = error;
    }

    expect(thrown).toBeInstanceOf(NonSerializableInputError);

    const failure = thrown as NonSerializableInputError;
    expect(failure.path).toBe(expected.path);
    expect(failure.received).toBe(expected.received);
    expect(failure.message).toBe(
        `Live input at "${expected.path}" is not serializable (received ${expected.received}).`
    );
}

/** Deterministic PRNG, so a failure is reproducible from its seed alone. */
function rng(seed: number): () => number {
    let state = seed >>> 0;

    return () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 0x100000000;
    };
}

const TAB = String.fromCharCode(9);
const NEWLINE = String.fromCharCode(10);
const NUL = String.fromCharCode(0);
const LONE_SURROGATE = String.fromCharCode(0xd800);
const EMOJI = String.fromCodePoint(0x1f642);

const STRINGS = [
    '', 'plain', 'with space', 'sym_$-.', 'quote"inside', 'back\\slash',
    `tab${TAB}char`, `line${NEWLINE}break`, `${NUL}control`, 'acentuacao',
    'ação', 'zhongwen-中文', EMOJI, LONE_SURROGATE, 'a'.repeat(300)
];

const SCALARS: unknown[] = [
    null, undefined, true, false, 0, -0, 1, -1, 1.5, 1e21, 1e-7,
    Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, ...STRINGS
];

const REJECTED: unknown[] = [
    Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY,
    10n, () => 1, Symbol('s'), new Date(), new Map(), new Set(), /re/,
    new (class Widget { constructor(public a = 1) {} })()
];

const KEYS = [
    'a', 'b', 'z', 'A', 'key with space', 'ç', 'quote"key', '_x', '',
    // Integer-like keys force the order-preserving fallback; they are the
    // shape the fast path provably cannot express.
    '1', '0', '10', '2', '1abc'
];

function grow(next: () => number, depth: number, allowRejected: boolean): unknown {
    const roll = next();

    if (depth <= 0 || roll < 0.45) {
        if (allowRejected && next() < 0.08) {
            return REJECTED[Math.floor(next() * REJECTED.length)];
        }

        return SCALARS[Math.floor(next() * SCALARS.length)];
    }

    if (roll < 0.72) {
        const length = Math.floor(next() * 5);
        const array = Array.from({ length }, () => grow(next, depth - 1, allowRejected));

        // Punch a hole sometimes: `Array.from` never produces a sparse array,
        // and holes are exactly where the old implementation was wrong.
        if (length > 0 && next() < 0.15) {
            delete array[Math.floor(next() * length)];
        }

        return array;
    }

    const object: Record<string, unknown> = {};
    const count = Math.floor(next() * 5);

    for (let i = 0; i < count; i++) {
        object[KEYS[Math.floor(next() * KEYS.length)]] = grow(next, depth - 1, allowRejected);
    }

    return object;
}

describe('canonical matches the implementation it replaced', () => {
    test('on every scalar, including the ones that must be rejected', () => {
        for (const value of [...SCALARS, ...REJECTED]) {
            agree(value);
        }
    });

    test('on objects whose keys need escaping, ordering or dropping', () => {
        agree({ b: 1, a: 2 });
        agree({ 'quote"key': 1, 'back\\slash': 2, 'ç': 3, '': 4 });
        agree({ a: undefined, b: null, c: undefined });
        agree({ z: 1, a: 2, A: 3, '1': 4, _: 5 });
        agree(Object.create(null));
        agree({ nested: { deep: { deeper: [1, { x: 'y' }] } } });
    });

    test('renders an array hole as null, as JSON.stringify does', () => {
        const holed = new Array(3);
        holed[1] = 'x';

        // The implementation this replaced emitted `[,1]` and `[,"x",]` here,
        // which no JSON parser accepts. This is the one deliberate change.
        expect(canonical([, 1])).toBe('[null,1]');
        expect(canonical([1, , 2])).toBe('[1,null,2]');
        expect(canonical(holed)).toBe('[null,"x",null]');
        expect(() => JSON.parse(canonical(holed))).not.toThrow();
        agree([, 1]);
        agree({ rows: [1, , 3] });
    });

    test('reports the same path for a rejected value in place', () => {
        agree({ filters: [{ since: new Date() }] });
        agree([[[Number.NaN]]]);
        agree({ a: { b: [0, 1, { c: () => 1 }] } });
        agree({ 'key with space': new Map() });
        agree([{ ok: 1 }, { bad: 10n }]);
    });

    test('on 4000 generated values across 8 seeds', () => {
        for (let seed = 1; seed <= 8; seed++) {
            const next = rng(seed * 7919);

            for (let i = 0; i < 500; i++) {
                agree(grow(next, 4, i % 3 === 0));
            }
        }
    });
});

describe('the order-preserving fallback', () => {
    test('sorts lexicographically where an object literal cannot', () => {
        // A JS object always enumerates '1' before '', whatever the insertion
        // order, so this can only come out right off the fallback path.
        expect(canonical({ '1': 1, '': 2 })).toBe('{"":2,"1":1}');
        expect(canonical({ '10': 'a', '2': 'b', name: 'c' }))
            .toBe('{"10":"a","2":"b","name":"c"}');
        agree({ '1': 1, '': 2 });
        agree({ '10': 'a', '2': 'b', name: 'c' });
    });

    test('a map keyed by id sorts as strings, not as numbers', () => {
        const byId: Record<string, unknown> = {};

        for (const id of [3, 20, 100, 1]) {
            byId[String(id)] = { id };
        }

        expect(canonical(byId)).toBe('{"1":{"id":1},"100":{"id":100},"20":{"id":20},"3":{"id":3}}');
        agree(byId);
    });

    test('still rejects, and at the same path, once it has taken over', () => {
        agree({ '1': new Date() });
        agree({ rows: { '2': { at: new Date() } } });
        agree({ '0': [Number.NaN] });
    });

    test('an integer-like key deep in the value moves the whole value over', () => {
        agree({ outer: { inner: [{ '7': 1, a: 2 }] }, sibling: 'kept' });
        expect(canonical({ outer: { inner: [{ '7': 1, a: 2 }] }, sibling: 'kept' }))
            .toBe('{"outer":{"inner":[{"7":1,"a":2}]},"sibling":"kept"}');
    });

    test('a key that only looks like an index is handled the same way', () => {
        // '1abc' is not an array index, but the digit check is coarse on
        // purpose: it must still come out right, only slower.
        agree({ '1abc': 1, a: 2 });
        expect(canonical({ '1abc': 1, a: 2 })).toBe('{"1abc":1,"a":2}');
    });
});

describe('the rewrite keeps its own invariants', () => {
    test('a key beyond the quoting cache is still quoted correctly', () => {
        const wide: Record<string, unknown> = {};

        // Past MAX_CACHED_KEYS quoting stops being cached, and must not change.
        for (let i = 0; i < 700; i++) {
            wide[`k${i}"x`] = i;
        }

        agree(wide);
    });

    test('is reentrant: a getter that canonicalizes does not corrupt the outer walk', () => {
        const inner = { b: 2, a: 1 };
        let seen = '';

        const outer = {
            plain: 1,
            get tricky() {
                seen = canonical(inner);
                return 'value';
            }
        };

        // A module-level accumulator would interleave the two walks here.
        expect(canonical(outer)).toBe('{"plain":1,"tricky":"value"}');
        expect(seen).toBe('{"a":1,"b":2}');
    });
});
