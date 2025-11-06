import { Context } from '@cheetah.js/core';
import { Queue, JobsOptions } from 'bullmq';


export class QueueClientProxy {

  constructor(
    public readonly queue: Queue,
    public readonly context: Context
  ) {}


  async add(
    jobName: string,
    data: any = {},
    options?: JobsOptions
  ): Promise<any> {
    const enrichedData = this.injectTrackingId(data);

    return this.queue.add(jobName, enrichedData, options);
  }


  async addBulk(
    jobs: Array<{ name: string; data?: any; opts?: JobsOptions }>
  ): Promise<any> {
    const enrichedJobs = jobs.map(job => ({
      ...job,
      data: this.injectTrackingId(job.data || {}),
    }));

    return this.queue.addBulk(enrichedJobs);
  }


  public injectTrackingId(data: any): any {
    const trackingId = this.context?.trackingId || this.generateTrackingId();

    return {
      ...data,
      __trackingId: trackingId,
    };
  }


  public generateTrackingId(): string {
    return crypto.randomUUID();
  }
}
