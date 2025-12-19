import { Queue, JobsOptions, Job } from 'bullmq';


export class QueueClientProxy {

  constructor(
    public readonly queue: Queue
  ) {}


  async add(
    jobName: string,
    data: any = {},
    options?: JobsOptions
  ): Promise<any> {
    return this.queue.add(jobName, data, options);
  }


  async addBulk(
    jobs: Array<{ name: string; data?: any; opts?: JobsOptions }>
  ): Promise<any> {
    return this.queue.addBulk(jobs as any);
  }


  async getJob(jobId: string): Promise<Job | undefined> {
    const job = await this.queue.getJob(jobId);

    return job;
  }
}
