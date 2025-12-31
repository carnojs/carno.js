import { Injectable } from '@carno.js/core';
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
    queueName: string,
    workerId: string,
    processor: (job: Job) => Promise<any>,
    options: any = {}
  ): Worker {
    const connection = this.getConnectionConfig(options);
    const concurrency = options.concurrency ?? 1;

    const worker = new Worker(queueName, processor, {
      connection,
      concurrency,
    });

    this.queueRegistry.addWorker(workerId, worker);

    return worker;
  }

  private getConnectionConfig(options: any): any {
    return this.connectionManager.getConnection(
      options.connection
    );
  }
}
