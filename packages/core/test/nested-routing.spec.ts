import { describe, expect, test } from 'bun:test';
import { Controller, Get, Use, Context, Carno } from '../src';
import { withTestApp } from '../src/testing/TestHarness';

describe('Nested Controllers', () => {
    test('children inherit parent path prefix', async () => {
        @Controller('/child')
        class ChildController {
            @Get('/route')
            route() {
                return 'child route';
            }
        }

        @Controller({
            path: '/parent',
            children: [ChildController]
        })
        class ParentController { }

        await withTestApp(
            async (harness) => {
                const res = await harness.get('/parent/child/route');
                expect(res.status).toBe(200);
                expect(await res.text()).toBe('child route');
            },
            {
                controllers: [ParentController],
                listen: true
            }
        );
    });

    test('deep nesting works', async () => {
        @Controller('/leaf')
        class LeafController {
            @Get()
            get() { return 'leaf'; }
        }

        @Controller({ path: '/middle', children: [LeafController] })
        class MiddleController { }

        @Controller({ path: '/root', children: [MiddleController] })
        class RootController { }

        await withTestApp(
            async (harness) => {
                const res = await harness.get('/root/middle/leaf');
                expect(res.status).toBe(200);
                expect(await res.text()).toBe('leaf');
            },
            {
                controllers: [RootController],
                listen: true
            }
        );
    });

    test('children inherit parent middlewares', async () => {
        const parentGap: any[] = [];

        const parentMiddleware = (ctx: Context) => {
            parentGap.push('parent');
        };

        const childMiddleware = (ctx: Context) => {
            parentGap.push('child');
        };

        @Controller('/child')
        @Use(childMiddleware)
        class ChildController {
            @Get()
            get() { return 'ok'; }
        }

        @Controller({
            path: '/parent',
            children: [ChildController]
        })
        @Use(parentMiddleware)
        class ParentController { }

        await withTestApp(
            async (harness) => {
                const res = await harness.get('/parent/child');
                expect(res.status).toBe(200);
                expect(parentGap).toEqual(['parent', 'child']);
            },
            {
                controllers: [ParentController],
                listen: true
            }
        );
    });
});
