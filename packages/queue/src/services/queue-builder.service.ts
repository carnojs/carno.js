import { Injectable } from '@cheetah.js/core';
import { Queue, Worker, Job } from 'bullmq';
import { ConnectionManagerService } from './connection-manager.service';
import { QueueRegistry } from '../queue.registry';

@Injectable()
export class QueueBuilderService {
  constructor(
    private connectionManager: ConnectionManagerService,
    private queueRegistry: QueueRegistry
  ) {}

  createQueue(name: string, options: any = {}): Queue {
    const connection = this.getConnectionConfig(options);

    const queue = new Queue(name, {
      connection,
      defaultJobOptions: options.defaultJobOptions,
    });

    this.queueRegistry.addQueue(name, queue);

    return queue;
  }

  createWorker(
    name: string,
    processor: (job: Job) => Promise<any>,
    options: any = {}
  ): Worker {
    const connection = this.getConnectionConfig(options);

    const worker = new Worker(name, processor, {
      connection,
      concurrency: options.concurrency,
    });

    this.queueRegistry.addWorker(name, worker);

    return worker;
  }

  private getConnectionConfig(options: any): any {
    return this.connectionManager.getConnection(
      options.connection
    );
  }
}
