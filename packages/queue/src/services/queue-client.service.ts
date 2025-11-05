import { Injectable, Context } from '@cheetah.js/core';
import { ProviderScope } from '@cheetah.js/core';
import { Queue, JobsOptions } from 'bullmq';
import { QueueRegistry } from '../queue.registry';


@Injectable({ scope: ProviderScope.REQUEST })
export class QueueClient {

  constructor(
    private queueRegistry: QueueRegistry,
    private context: Context
  ) {}


  async add(
    queueName: string,
    jobName: string,
    data: any = {},
    options?: JobsOptions
  ): Promise<any> {
    const queue = this.getQueue(queueName);

    const enrichedData = this.injectTrackingId(data);

    return queue.add(jobName, enrichedData, options);
  }


  async addBulk(
    queueName: string,
    jobs: Array<{ name: string; data?: any; opts?: JobsOptions }>
  ): Promise<any> {
    const queue = this.getQueue(queueName);

    const enrichedJobs = jobs.map(job => ({
      ...job,
      data: this.injectTrackingId(job.data || {}),
    }));

    return queue.addBulk(enrichedJobs);
  }


  private getQueue(queueName: string): Queue {
    const queue = this.queueRegistry.getQueue(queueName);

    if (!queue) {
      throw new Error(`Queue "${queueName}" not found`);
    }

    return queue;
  }


  private injectTrackingId(data: any): any {
    return {
      ...data,
      __trackingId: this.context.trackingId,
    };
  }
}
