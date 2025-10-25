import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { QueueRegistry } from '../src';
import { Queue, Worker } from 'bullmq';

describe('QueueRegistry', () => {
  let registry: QueueRegistry;
  let queue: Queue;
  let worker: Worker;

  beforeAll(() => {
    registry = new QueueRegistry();

    queue = new Queue('test', {
      connection: {
        host: 'localhost',
        port: 6379,
      },
    });

    worker = new Worker('test', async () => {}, {
      connection: {
        host: 'localhost',
        port: 6379,
      },
    });
  });

  afterAll(async () => {
    await queue.close();
    await worker.close();
  });

  test('should add and get queue', () => {
    registry.addQueue('test', queue);

    const retrieved = registry.getQueue('test');

    expect(retrieved).toBe(queue);

    expect(registry.hasQueue('test')).toBe(true);
  });

  test('should add and get worker', () => {
    registry.addWorker('test', worker);

    const retrieved = registry.getWorker('test');

    expect(retrieved).toBe(worker);

    expect(registry.hasWorker('test')).toBe(true);
  });

  test('should throw when queue not found', () => {
    expect(() => {
      registry.getQueue('nonexistent');
    }).toThrow();
  });

  test('should throw when worker not found', () => {
    expect(() => {
      registry.getWorker('nonexistent');
    }).toThrow();
  });
});
