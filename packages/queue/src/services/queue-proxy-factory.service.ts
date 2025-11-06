import { Context } from '@cheetah.js/core';
import { Queue } from 'bullmq';
import { QueueClientProxy } from './queue-client-proxy.service';


export function createQueueProxyFactory(queue: Queue) {
  return class extends QueueClientProxy {
    constructor(context: Context) {
      super(queue, context);
    }
  };
}
