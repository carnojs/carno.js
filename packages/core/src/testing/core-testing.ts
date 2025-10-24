import type {Server} from 'bun';
import {Cheetah, ApplicationConfig} from '../Cheetah';
import {InjectorService} from '../container/InjectorService';

export type CoreTestOptions = {
  config?: ApplicationConfig;
  listen?: boolean | number;
  port?: number;
};

export type CoreTestHarness = {
  app: Cheetah;
  injector: InjectorService;
  server?: Server<any>;
  port?: number;
  resolve<T>(token: any): T;
  request(target: string | URL, init?: RequestInit): Promise<Response>;
  close(): Promise<void>;
};

export type CoreTestRoutine = (harness: CoreTestHarness) => Promise<void>;

export async function createCoreTestHarness(options: CoreTestOptions = {}): Promise<CoreTestHarness> {
  const app = new Cheetah(options.config);
  const boot = await bootApplication(app, options);
  const injector = app.getInjector();
  const resolve = <T>(token: any): T => injector.invoke(token);
  const request = async (target: string | URL, init?: RequestInit): Promise<Response> => {
    if (!boot.server) {
      throw new Error('HTTP server is not running. Enable the listen option to issue requests.');
    }

    const url = buildRequestUrl(boot.port ?? boot.server.port, target);

    return fetch(url, init);
  };
  const close = async (): Promise<void> => shutdown(app, boot.server);

  return {
    app,
    injector,
    server: boot.server,
    port: boot.port ?? boot.server?.port,
    resolve,
    request,
    close,
  };
}

export async function withCoreApplication(
  routine: CoreTestRoutine,
  options: CoreTestOptions = {},
): Promise<void> {
  const harness = await createCoreTestHarness(options);

  try {
    await routine(harness);
  } finally {
    await harness.close();
  }
}

type BootResult = {
  server?: Server<any>;
  port?: number;
};

async function bootApplication(app: Cheetah, options: CoreTestOptions): Promise<BootResult> {
  if (!shouldListen(options.listen)) {
    await app.init();

    return {};
  }

  const port = resolveListenPort(options);

  await app.listen(port);

  const server = app.getHttpServer();
  const runningPort = server?.port ?? port;

  return {server, port: runningPort};
}

function shouldListen(value: CoreTestOptions['listen']): boolean {
  if (typeof value === 'number') {
    return true;
  }

  return Boolean(value);
}

function resolveListenPort(options: CoreTestOptions): number {
  if (typeof options.listen === 'number') {
    return options.listen;
  }

  if (typeof options.port === 'number') {
    return options.port;
  }

  return 0;
}

function buildRequestUrl(port: number, target: string | URL): string {
  if (target instanceof URL) {
    return target.toString();
  }

  if (isAbsoluteUrl(target)) {
    return target;
  }

  const path = target.startsWith('/') ? target : `/${target}`;

  return `http://127.0.0.1:${port}${path}`;
}

function isAbsoluteUrl(target: string): boolean {
  return /^https?:\/\//i.test(target);
}

async function shutdown(app: Cheetah, server?: Server<any>): Promise<void> {
  if (!server) {
    app.close();

    return;
  }

  app.close(true);
}
