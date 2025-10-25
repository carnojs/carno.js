import { ConnectionOptions } from 'bullmq';

export interface QueueOptions {
  name?: string;
  connection?: ConnectionOptions;
  defaultJobOptions?: {
    attempts?: number;
    backoff?: number | { type: string; delay: number };
    delay?: number;
    removeOnComplete?: boolean | number;
    removeOnFail?: boolean | number;
  };
}
