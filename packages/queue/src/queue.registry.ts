import { Service } from '@carno.js/core';
import { Queue, Worker } from 'bullmq';

@Service()
export class QueueRegistry {
  private readonly queues = new Map<string, Queue>();
  private readonly workers = new Map<string, Worker>();

  hasQueue(name: string): boolean {
    return this.queues.has(name);
  }

  getQueue(name: string): Queue {
    const queue = this.queues.get(name);

    if (!queue) {
      throw new Error(`Queue "${name}" not found`);
    }

    return queue;
  }

  addQueue(name: string, queue: Queue): void {
    if (this.hasQueue(name)) {
      throw new Error(`Queue "${name}" already exists`);
    }

    this.queues.set(name, queue);
  }

  hasWorker(name: string): boolean {
    return this.workers.has(name);
  }

  getWorker(name: string): Worker {
    const worker = this.workers.get(name);

    if (!worker) {
      throw new Error(`Worker "${name}" not found`);
    }

    return worker;
  }

  addWorker(name: string, worker: Worker): void {
    if (this.hasWorker(name)) {
      throw new Error(`Worker "${name}" already exists`);
    }

    this.workers.set(name, worker);
  }

  getQueues(): Map<string, Queue> {
    return this.queues;
  }

  getWorkers(): Map<string, Worker> {
    return this.workers;
  }

  async closeQueue(name: string): Promise<void> {
    const queue = this.getQueue(name);

    await queue.close();

    this.queues.delete(name);
  }

  async closeWorker(name: string): Promise<void> {
    const worker = this.getWorker(name);

    await worker.close();

    this.workers.delete(name);
  }

  async closeAll(): Promise<void> {
    console.log("Closing all workers and queues...");
    await this.closeAllWorkers();
    await this.closeAllQueues();
    console.log("All workers and queues closed.");
  }

  private async closeAllQueues(): Promise<void> {
    const names = Array.from(this.queues.keys());

    for (const name of names) {
      console.log(`Closing queue: ${name}`);
      await this.closeQueue(name);
    }
  }

  private async closeAllWorkers(): Promise<void> {
    const names = Array.from(this.workers.keys());

    for (const name of names) {
      console.log(`Closing worker: ${name}`);
      await this.closeWorker(name);
    }
  }
}
