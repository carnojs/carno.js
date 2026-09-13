import { afterEach, describe, expect, test } from 'bun:test';
import { Controller, Get, createTestHarness } from '@carno.js/core';
import { Live } from '../src/decorators/Live';
import { LivePlugin } from '../src/LivePlugin';
import { ResourceRegistry } from '../src/resource/ResourceRegistry';
import { closeLiveRuntime } from '../src/runtime';
import { defaultScopeWarning } from '../src/scope-warning';
import { ConnectionScopeResolver } from '../src/transport/scope-resolver';
import { directResourceExecutor } from './resource-registry-helper';

@Controller('/mixed')
class MixedController {
    @Get('/inbox')
    @Live()
    inbox() {
        return [];
    }

    @Get('/me')
    @Live({ shared: 'private' })
    me() {
        return {};
    }

    @Get('/catalogue')
    @Live({ shared: 'public' })
    catalogue() {
        return [];
    }

    @Get('/org')
    @Live({ shared: 'tenant' })
    org() {
        return [];
    }
}

function registry(): ResourceRegistry {
    const resources = new ResourceRegistry();
    resources.register(MixedController, new MixedController(), directResourceExecutor);

    return resources;
}

describe('ResourceRegistry.idsShared', () => {
    test('counts an undeclared @Live() as private', () => {
        expect(registry().idsShared('private')).toEqual([
            'MixedController.inbox',
            'MixedController.me'
        ]);
    });

    test('separates the shared modes', () => {
        expect(registry().idsShared('public')).toEqual(['MixedController.catalogue']);
        expect(registry().idsShared('tenant')).toEqual(['MixedController.org']);
    });
});

describe('the default-scope boot warning', () => {
    test('names the private resources and the node ceiling', () => {
        const warning = defaultScopeWarning({
            privateResourceIds: registry().idsShared('private'),
            usingDefaultResolver: true,
            maxInstancesPerNode: 50000
        });

        expect(warning).toContain('MixedController.inbox');
        expect(warning).toContain('MixedController.me');
        expect(warning).toContain('50000');
        expect(warning).toContain('scopeResolver');
        // The modes that do not scale in connections stay out of it.
        expect(warning).not.toContain('MixedController.catalogue');
        expect(warning).not.toContain('MixedController.org');
    });

    test('says nothing once the application brings its own resolver', () => {
        expect(defaultScopeWarning({
            privateResourceIds: ['A.list'],
            usingDefaultResolver: false,
            maxInstancesPerNode: 50000
        })).toBeNull();
    });

    test('says nothing when no resource is private', () => {
        expect(defaultScopeWarning({
            privateResourceIds: [],
            usingDefaultResolver: true,
            maxInstancesPerNode: 50000
        })).toBeNull();
    });

    test('collapses a long list to a count', () => {
        const ids = Array.from({ length: 12 }, (_, index) => `C.r${index}`);
        const warning = defaultScopeWarning({
            privateResourceIds: ids,
            usingDefaultResolver: true,
            maxInstancesPerNode: 50000
        });

        expect(warning).toContain('C.r7');
        expect(warning).not.toContain('C.r8');
        expect(warning).toContain('and 4 more');
    });

    test('agrees in number with a single resource', () => {
        const warning = defaultScopeWarning({
            privateResourceIds: ['A.list'],
            usingDefaultResolver: true,
            maxInstancesPerNode: 50000
        });

        expect(warning).toContain('1 live resource is private');
    });
});

@Controller('/inbox')
class InboxController {
    @Get('/')
    @Live()
    read() {
        return { unread: 0 };
    }
}

/** Boot an app and return what it wrote to the console while starting. */
async function bootLogs(options: { scopeResolver?: ConnectionScopeResolver } = {}): Promise<string> {
    const written: string[] = [];
    const original = console.warn;
    console.warn = (...args: unknown[]) => { written.push(args.map(String).join(' ')); };

    try {
        const harness = await createTestHarness({
            plugins: [LivePlugin.create({ controllers: [InboxController], ...options })],
            listen: true
        });

        await harness.close();
    } finally {
        console.warn = original;
    }

    return written.join('\n');
}

describe('the warning as the application sees it', () => {
    afterEach(async () => {
        await closeLiveRuntime();
    });

    test('a private resource with no resolver warns at boot', async () => {
        expect(await bootLogs()).toContain('InboxController.read');
    });

    test('an explicit ConnectionScopeResolver is taken as the answer', async () => {
        expect(await bootLogs({ scopeResolver: new ConnectionScopeResolver() })).toBe('');
    });
});
