/**
 * Ultra-fast Radix Router for Turbo.
 * 
 * Optimizations:
 * - Char code comparisons (no string allocations)
 * - Frozen empty params object
 * - O(1) method lookup via char code index
 * - Minimal allocations in hot path
 */

const EMPTY_PARAMS: Readonly<Record<string, string>> = Object.freeze({});

interface Node<T> {
    part: string;
    store: T | null;
    children: Map<number, Node<T>> | null;
    paramChild: ParamNode<T> | null;
    wildcardStore: T | null;
}

interface ParamNode<T> {
    name: string;
    store: T | null;
    child: Node<T> | null;
}

export interface RouteMatch<T> {
    store: T;
    params: Record<string, string>;
}

function createNode<T>(part: string): Node<T> {
    return {
        part,
        store: null,
        children: null,
        paramChild: null,
        wildcardStore: null
    };
}

export class RadixRouter<T> {
    private roots: Record<string, Node<T>> = {};

    add(method: string, path: string, store: T): void {
        if (path === '') path = '/';
        if (path[0] !== '/') path = '/' + path;

        const isWildcard = path.endsWith('*');

        if (isWildcard) path = path.slice(0, -1);

        let node = this.roots[method];

        if (!node) {
            node = this.roots[method] = createNode('/');
        }

        let i = 0;
        const len = path.length;

        while (i < len) {
            const char = path.charCodeAt(i);

            if (char === 58) {
                const paramStart = i + 1;
                let paramEnd = paramStart;

                while (paramEnd < len && path.charCodeAt(paramEnd) !== 47) {
                    paramEnd++;
                }

                const paramName = path.slice(paramStart, paramEnd);

                if (!node.paramChild) {
                    node.paramChild = { name: paramName, store: null, child: null };
                }

                if (paramEnd >= len) {
                    node.paramChild.store = store;
                    return;
                }

                if (!node.paramChild.child) {
                    node.paramChild.child = createNode(path.slice(paramEnd));
                }

                node = node.paramChild.child;
                i = paramEnd;
                continue;
            }

            let segmentEnd = i;

            while (segmentEnd < len && path.charCodeAt(segmentEnd) !== 47 && path.charCodeAt(segmentEnd) !== 58) {
                segmentEnd++;
            }

            if (segmentEnd < len && path.charCodeAt(segmentEnd) === 47) {
                segmentEnd++;
            }

            const segment = path.slice(i, segmentEnd);

            if (segment === node.part) {
                i = segmentEnd;
                continue;
            }

            if (!node.children) {
                node.children = new Map();
            }

            const firstChar = segment.charCodeAt(0);
            let child = node.children.get(firstChar);

            if (!child) {
                child = createNode(segment);
                node.children.set(firstChar, child);
            }

            node = child;
            i = segmentEnd;
        }

        if (isWildcard) {
            node.wildcardStore = store;
        } else {
            node.store = store;
        }
    }

    find(method: string, path: string): RouteMatch<T> | null {
        const root = this.roots[method];

        if (!root) return null;

        return this.matchPath(root, path, 0, path.length);
    }

    private matchPath(
        node: Node<T>,
        path: string,
        start: number,
        len: number
    ): RouteMatch<T> | null {
        const partLen = node.part.length;
        const end = start + partLen;

        if (partLen > 1) {
            if (end > len) return null;

            for (let i = 1, j = start + 1; i < partLen; i++, j++) {
                if (node.part.charCodeAt(i) !== path.charCodeAt(j)) {
                    return null;
                }
            }
        }

        if (end === len) {
            if (node.store !== null) {
                return { store: node.store, params: EMPTY_PARAMS };
            }

            if (node.wildcardStore !== null) {
                return { store: node.wildcardStore, params: { '*': '' } };
            }

            return null;
        }

        if (node.children) {
            const child = node.children.get(path.charCodeAt(end));

            if (child) {
                const result = this.matchPath(child, path, end, len);

                if (result) return result;
            }
        }

        if (node.paramChild) {
            const param = node.paramChild;
            let paramEnd = end;

            while (paramEnd < len && path.charCodeAt(paramEnd) !== 47) {
                paramEnd++;
            }

            if (paramEnd === end) return null;

            const paramValue = path.slice(end, paramEnd);

            if (paramEnd >= len) {
                if (param.store !== null) {
                    return {
                        store: param.store,
                        params: { [param.name]: paramValue }
                    };
                }
            } else if (param.child) {
                const result = this.matchPath(param.child, path, paramEnd, len);

                if (result) {
                    if (result.params === EMPTY_PARAMS) {
                        result.params = { [param.name]: paramValue };
                    } else {
                        result.params[param.name] = paramValue;
                    }

                    return result;
                }
            }
        }

        if (node.wildcardStore !== null) {
            return {
                store: node.wildcardStore,
                params: { '*': path.slice(end) }
            };
        }

        return null;
    }
}
