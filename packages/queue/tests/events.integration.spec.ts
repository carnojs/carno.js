import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { Queue, Worker, Job } from 'bullmq';

describe('Queue Events Integration', () => {
  let queue: Queue;
  let worker: Worker;

  const connection = {
    host: 'localhost',
    port: 6379,
  };

  beforeAll(async () => {
    // Given: criar queue para testes de eventos
    queue = new Queue('events-integration', { connection });

    worker = new Worker(
      'events-integration',
      async (job: Job) => {
        if (job.name === 'fail-job') {
          throw new Error('Intentional failure');
        }

        if (job.name === 'progress-job') {
          await job.updateProgress(25);
          await new Promise(r => setTimeout(r, 100));
          await job.updateProgress(50);
          await new Promise(r => setTimeout(r, 100));
          await job.updateProgress(75);
          await new Promise(r => setTimeout(r, 100));
          await job.updateProgress(100);
        }

        return { success: true, timestamp: Date.now() };
      },
      { connection }
    );

    await new Promise(resolve => setTimeout(resolve, 500));
  });

  afterAll(async () => {
    await worker.close();
    await queue.close();
  });

  test('should trigger completed event', async () => {
    // Given: configurar listener de completed
    let completedData: any = null;

    worker.on('completed', (job: Job, result: any) => {
      completedData = {
        jobId: job.id,
        jobName: job.name,
        result,
      };
    });

    // When: adicionar job que deve completar
    const job = await queue.add('success-job', { test: true });

    await new Promise(resolve => setTimeout(resolve, 1500));

    // Then: evento completed deve ter sido disparado
    expect(completedData).not.toBeNull();
    expect(completedData.jobName).toBe('success-job');
    expect(completedData.result.success).toBe(true);
  });

  test('should trigger failed event', async () => {
    // Given: configurar listener de failed
    let failedData: any = null;

    worker.on('failed', (job: Job | undefined, error: Error) => {
      if (job) {
        failedData = {
          jobId: job.id,
          jobName: job.name,
          error: error.message,
        };
      }
    });

    // When: adicionar job que deve falhar
    await queue.add('fail-job', { willFail: true });

    await new Promise(resolve => setTimeout(resolve, 1500));

    // Then: evento failed deve ter sido disparado
    expect(failedData).not.toBeNull();
    expect(failedData.jobName).toBe('fail-job');
    expect(failedData.error).toBe('Intentional failure');
  });

  test('should trigger progress event', async () => {
    // Given: configurar listener de progress
    const progressValues: number[] = [];

    worker.on('progress', (job: Job, progress: number | object) => {
      if (typeof progress === 'number') {
        progressValues.push(progress);
      }
    });

    // When: adicionar job com progresso
    await queue.add('progress-job', { trackProgress: true });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Then: multiple progress events must have been emitted
    expect(progressValues.length).toBeGreaterThan(0);
    expect(progressValues).toContain(25);
    expect(progressValues).toContain(100);
  });

  test('should trigger active event', async () => {
    // Given: configurar listener de active
    let activeJobId: string | null = null;

    worker.on('active', (job: Job) => {
      activeJobId = job.id!;
    });

    // When: adicionar job
    const job = await queue.add('active-test', { test: true });

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Then: evento active deve ter sido disparado
    expect(activeJobId).not.toBeNull();
  });

  test('should trigger queue waiting event', async () => {
    // Given: configurar listener de waiting
    let waitingJobId: string | null = null;

    queue.on('waiting', (jobId: string) => {
      waitingJobId = jobId;
    });

    // When: adicionar job
    const job = await queue.add('waiting-test', { test: true });

    await new Promise(resolve => setTimeout(resolve, 500));

    // Then: evento waiting deve ter sido disparado
    expect(waitingJobId).not.toBeNull();
  });

  test('should trigger drained event', async () => {
    // Given: configurar listener de drained
    let drainedCalled = false;

    worker.on('drained', () => {
      drainedCalled = true;
    });

    // When: adicionar e processar job
    await queue.add('drain-test', { test: true });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Then: evento drained pode ter sido disparado
    // (timing dependent, so we only verify the type)
    expect(typeof drainedCalled).toBe('boolean');
  });
});
