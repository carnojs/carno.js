import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { Container } from '@carno.js/core';
import { QueueRegistry } from '../src';
import { Queue as BullQueue, Worker, Job } from 'bullmq';

describe('Queue Module Integration', () => {
  let container: Container;
  let registry: QueueRegistry;
  let testQueue: BullQueue;
  let testWorker: Worker;

  beforeAll(async () => {
    container = new Container();
    registry = new QueueRegistry();

    container.register({ token: QueueRegistry, useValue: registry });

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

    await new Promise(resolve => setTimeout(resolve, 500));
  });

  afterAll(async () => {
    if (registry) {
      await registry.closeAll();
    }
  });

  test('should initialize QueueRegistry', () => {
    expect(registry).toBeDefined();
    expect(registry).toBeInstanceOf(QueueRegistry);
  });

  test('should register queue successfully', () => {
    expect(registry.hasQueue('integration-test')).toBe(true);

    const queue = registry.getQueue('integration-test');

    expect(queue).toBeDefined();
    expect(queue.name).toBe('integration-test');
  });

  test('should register worker successfully', () => {
    expect(registry.hasWorker('integration-test')).toBe(true);

    const worker = registry.getWorker('integration-test');

    expect(worker).toBeDefined();
  });

  test('should add and process job', async () => {
    const jobData = {
      userId: 123,
      action: 'send-email',
      email: 'test@example.com',
    };

    const job = await testQueue.add('email-job', jobData);

    expect(job).toBeDefined();
    expect(job.name).toBe('email-job');
    expect(job.data).toEqual(jobData);

    await new Promise(resolve => setTimeout(resolve, 1500));

    const state = await job.getState();
    expect(state).toBe('completed');

    try {
      const result = await job.returnvalue;
      if (result) {
        expect(result.processed).toBe(true);
        expect(result.data).toEqual(jobData);
      }
    } catch (e) {
      expect(state).toBe('completed');
    }
  });

  test('should handle multiple jobs', async () => {
    const jobs = await Promise.all([
      testQueue.add('job1', { index: 1 }),
      testQueue.add('job2', { index: 2 }),
      testQueue.add('job3', { index: 3 }),
    ]);

    expect(jobs).toHaveLength(3);

    await new Promise(resolve => setTimeout(resolve, 2000));

    const states = await Promise.all(
      jobs.map(job => job.getState())
    );

    states.forEach(state => {
      expect(['completed', 'active'].includes(state)).toBe(true);
    });
  });

  test('should get queue count', async () => {
    await testQueue.add('count-test-1', { test: 1 });
    await testQueue.add('count-test-2', { test: 2 });

    await new Promise(resolve => setTimeout(resolve, 500));

    const counts = await testQueue.getJobCounts();

    expect(counts).toBeDefined();
    expect(typeof counts.waiting).toBe('number');
    expect(typeof counts.active).toBe('number');
    expect(typeof counts.completed).toBe('number');
  });

  test('should clean completed jobs', async () => {
    await testQueue.add('cleanup-test', { cleanup: true });

    await new Promise(resolve => setTimeout(resolve, 1000));

    const cleaned = await testQueue.clean(0, 100, 'completed');

    expect(Array.isArray(cleaned)).toBe(true);
  });
});
