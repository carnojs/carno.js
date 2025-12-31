import { Metadata } from '@carno.js/core';
import { QUEUE_EVENT_METADATA } from '../constants';

function createQueueEventDecorator(
  eventName: string
): () => MethodDecorator {
  return () => {
    return (target, propertyKey) => {
      addEventMetadata(
        eventName,
        target,
        propertyKey
      );
    };
  };
}

function addEventMetadata(
  eventName: string,
  target: any,
  propertyKey: string | symbol
): void {
  const metadata = {
    eventName,
    methodName: propertyKey,
    target,
  };

  const existing = Metadata.get(
    QUEUE_EVENT_METADATA,
    Reflect
  ) || [];

  Metadata.set(
    QUEUE_EVENT_METADATA,
    [...existing, metadata],
    Reflect
  );
}

export const OnQueueCleaned = createQueueEventDecorator('cleaned');
export const OnQueueDrained = createQueueEventDecorator('drained');
export const OnQueueError = createQueueEventDecorator('error');
export const OnQueuePaused = createQueueEventDecorator('paused');
export const OnQueueResumed = createQueueEventDecorator('resumed');
export const OnQueueWaiting = createQueueEventDecorator('waiting');
