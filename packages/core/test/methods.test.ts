import { describe, expect, test } from 'bun:test';
import { Controller, Get, Post } from '../src';
import { withTestApp } from '../src/testing/TestHarness';

@Controller('/methods')
class MethodController {
    @Get('/test')
    get() {
        return { method: 'GET' };
    }

    @Post('/test')
    post() {
        return { method: 'POST' };
    }
}

describe('HTTP Methods', () => {
    test('should handle GET and POST on same path', async () => {
        await withTestApp(async (harness) => {
            const getRes = await harness.get('/methods/test');
            expect(getRes.status).toBe(200);
            expect(await getRes.json()).toEqual({ method: 'GET' });

            const postRes = await harness.post('/methods/test', {});
            expect(postRes.status).toBe(200);
            expect(await postRes.json()).toEqual({ method: 'POST' });
        }, {
            controllers: [MethodController],
            listen: true // Need to listen for HTTP requests
        });
    });
});
