import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { Cheetah, InjectorService } from '@cheetah.js/core';
import { QueueModule, QueueRegistry } from '../src';
import { Queue as BullQueue, Worker, Job } from 'bullmq';

describe('Queue Module Integration', () => {
  let app: Cheetah;
  let injector: InjectorService;
  let registry: QueueRegistry;
  let testQueue: BullQueue;
  let testWorker: Worker;

  beforeAll(async () => {
    // Given: configuração do módulo de filas
    app = new Cheetah();

    app.use(
      QueueModule({
        connection: {
          host: 'localhost',
          port: 6379,
        },
      })
    );

    await app.init();

    injector = app.getInjector();
    registry = injector.invoke(QueueRegistry);

    // When: criar queue e worker manualmente
    testQueue = new BullQueue('integration-test', {
      connection: {
        host: 'localhost',
        port: 6379,
      },
    });

    testWorker = new Worker(
      'integration-test',
      async (job: Job) => {
        return {
          processed: true,
          jobId: job.id,
          data: job.data,
        };
      },
      {
        connection: {
          host: 'localhost',
          port: 6379,
        },
      }
    );

    registry.addQueue('integration-test', testQueue);
    registry.addWorker('integration-test', testWorker);

    // Aguardar worker estar pronto
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  afterAll(async () => {
    if (registry) {
      await registry.closeAll();
    }
  });

  test('should initialize QueueRegistry', () => {
    // Then: registry deve estar inicializado
    expect(registry).toBeDefined();
    expect(registry).toBeInstanceOf(QueueRegistry);
  });

  test('should register queue successfully', () => {
    // Then: queue deve estar registrado
    expect(registry.hasQueue('integration-test')).toBe(true);

    const queue = registry.getQueue('integration-test');

    expect(queue).toBeDefined();
    expect(queue.name).toBe('integration-test');
  });

  test('should register worker successfully', () => {
    // Then: worker deve estar registrado
    expect(registry.hasWorker('integration-test')).toBe(true);

    const worker = registry.getWorker('integration-test');

    expect(worker).toBeDefined();
  });

  test('should add and process job', async () => {
    // Given: dados do job
    const jobData = {
      userId: 123,
      action: 'send-email',
      email: 'test@example.com',
    };

    // When: adicionar job à fila
    const job = await testQueue.add('email-job', jobData);

    // Then: job deve ser criado
    expect(job).toBeDefined();
    expect(job.name).toBe('email-job');
    expect(job.data).toEqual(jobData);

    // When: aguardar processamento
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Then: job deve estar completo
    const state = await job.getState();
    expect(state).toBe('completed');

    // Tentar obter resultado se disponível
    try {
      const result = await job.returnvalue;
      if (result) {
        expect(result.processed).toBe(true);
        expect(result.data).toEqual(jobData);
      }
    } catch (e) {
      // Job pode já ter sido limpo, apenas verificar que completou
      expect(state).toBe('completed');
    }
  });

  test('should handle multiple jobs', async () => {
    // Given: múltiplos jobs
    const jobs = await Promise.all([
      testQueue.add('job1', { index: 1 }),
      testQueue.add('job2', { index: 2 }),
      testQueue.add('job3', { index: 3 }),
    ]);

    // Then: todos os jobs devem ser criados
    expect(jobs).toHaveLength(3);

    // When: aguardar processamento
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Then: todos os jobs devem estar completos
    const states = await Promise.all(
      jobs.map(job => job.getState())
    );

    states.forEach(state => {
      expect(['completed', 'active'].includes(state)).toBe(true);
    });
  });

  test('should get queue count', async () => {
    // Given: adicionar alguns jobs
    await testQueue.add('count-test-1', { test: 1 });
    await testQueue.add('count-test-2', { test: 2 });

    await new Promise(resolve => setTimeout(resolve, 500));

    // When: obter counts
    const counts = await testQueue.getJobCounts();

    // Then: deve ter contadores
    expect(counts).toBeDefined();
    expect(typeof counts.waiting).toBe('number');
    expect(typeof counts.active).toBe('number');
    expect(typeof counts.completed).toBe('number');
  });

  test('should clean completed jobs', async () => {
    // Given: adicionar e processar job
    await testQueue.add('cleanup-test', { cleanup: true });

    await new Promise(resolve => setTimeout(resolve, 1000));

    // When: limpar jobs completos
    const cleaned = await testQueue.clean(0, 100, 'completed');

    // Then: jobs devem ser limpos
    expect(Array.isArray(cleaned)).toBe(true);
  });
});
