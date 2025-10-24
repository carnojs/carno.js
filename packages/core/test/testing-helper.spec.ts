import {describe, expect, test} from 'bun:test';
import {Cheetah, Controller, Get} from '../src';
import {withCoreApplication, createCoreTestHarness} from '../src/testing';

describe('Core testing helper', () => {
  @Controller({path: '/health'})
  class HealthController {
    @Get()
    health() {
      return {status: 'ok'};
    }
  }

  @Controller({path: '/status'})
  class StatusController {
    @Get()
    status() {
      return 'ready';
    }
  }

  test('withCoreApplication initializes injector without server', async () => {
    await withCoreApplication(async ({app, injector, server, resolve}) => {
      const provider = injector.get(HealthController);
      const instance = resolve<HealthController>(HealthController);

      expect(app).toBeInstanceOf(Cheetah);
      expect(server).toBeUndefined();
      expect(provider?.token).toBe(HealthController);
      expect(instance).toBeInstanceOf(HealthController);
    }, {config: {providers: [HealthController]}});
  });

  test('createCoreTestHarness performs http requests when listening', async () => {
    const harness = await createCoreTestHarness({
      listen: true,
      config: {providers: [StatusController]},
    });

    try {
      const response = await harness.request('/status');
      const payload = await response.text();

      expect(response.status).toBe(200);
      expect(payload).toBe('ready');
    } finally {
      await harness.close();
    }
  });
});
