/**
 * The one trap the default configuration sets, reported at boot.
 *
 * `@Live()` defaults to `shared: 'private'` and `ConnectionScopeResolver`
 * makes the connection id the principal, so with neither configured the
 * instance identity carries a connection id: two tabs of one user are two
 * instances, and N viewers of the same data are N computes, N diffs and N
 * queries. That is the safe default — nothing can leak between connections —
 * but it scales in connections rather than in data, and it is silent.
 *
 * Both halves are known at bootstrap, so this is a fact rather than a
 * heuristic: no sampling of a live instance rate is needed to state it.
 */

/** Resource ids listed inline before the message collapses to a count. */
const MAX_LISTED = 8;

export interface DefaultScopeWarningInput {
    /** Ids of the resources that resolved to `shared: 'private'`. */
    privateResourceIds: string[];
    /** False as soon as the application passes any resolver of its own. */
    usingDefaultResolver: boolean;
    /** `LiveConfig.maxInstancesPerNode`, the ceiling this default runs into. */
    maxInstancesPerNode: number;
}

/**
 * The warning text, or null when there is nothing to warn about.
 *
 * Returned rather than printed so the decision is testable without capturing
 * the console.
 */
export function defaultScopeWarning(input: DefaultScopeWarningInput): string | null {
    if (!input.usingDefaultResolver || input.privateResourceIds.length === 0) {
        return null;
    }

    const count = input.privateResourceIds.length;
    const listed = input.privateResourceIds.slice(0, MAX_LISTED).join(', ');
    const rest = count - Math.min(count, MAX_LISTED);
    const names = rest > 0 ? `${listed} and ${rest} more` : listed;
    const noun = count === 1 ? 'live resource is' : 'live resources are';

    return [
        '[carno:live] No `scopeResolver` was passed to LivePlugin.create(), so the default',
        'ConnectionScopeResolver keys every instance by connection id.',
        `  ${count} ${noun} private (the @Live() default) and will get one instance per`,
        '  connection rather than one per user:',
        `    ${names}`,
        '  Two tabs of the same user are two instances, and N viewers of the same data are N',
        `  computes, N diffs and N queries — against the ceiling of ${input.maxInstancesPerNode} instances per node`,
        '  (LiveConfig.maxInstancesPerNode), past which subscriptions are refused.',
        '  Fix: pass a `scopeResolver` whose principal is a user id, or declare the resources',
        '  that are genuinely shared as @Live({ shared: \'public\' }) or @Live({ shared: \'tenant\' }).',
        '  To keep per-connection instances and silence this, pass',
        '  `scopeResolver: new ConnectionScopeResolver()` explicitly.'
    ].join('\n');
}
