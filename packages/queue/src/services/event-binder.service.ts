import { Injectable } from '@cheetah.js/core';
import { Queue, Worker } from 'bullmq';

@Injectable()
export class EventBinderService {
  bindJobEvents(
    worker: Worker,
    events: any[],
    target: any
  ): void {
    events.forEach(event => {
      this.bindJobEvent(worker, event, target);
    });
  }

  bindQueueEvents(
    queue: Queue,
    events: any[],
    target: any
  ): void {
    events.forEach(event => {
      this.bindQueueEvent(queue, event, target);
    });
  }

  private bindJobEvent(
    worker: Worker,
    event: any,
    target: any
  ): void {
    const handler = target[event.methodName].bind(target);

    worker.on(event.eventName, handler);
  }

  private bindQueueEvent(
    queue: Queue,
    event: any,
    target: any
  ): void {
    const handler = target[event.methodName].bind(target);

    queue.on(event.eventName, handler);
  }
}
