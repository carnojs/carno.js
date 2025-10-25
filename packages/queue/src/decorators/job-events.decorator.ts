import { Metadata } from '@cheetah.js/core';
import { JOB_EVENT_METADATA } from '../constants';

function createJobEventDecorator(
  eventName: string
): (jobName?: string) => MethodDecorator {
  return (jobName?: string) => {
    return (target, propertyKey) => {
      addEventMetadata(
        eventName,
        jobName,
        target,
        propertyKey
      );
    };
  };
}

function addEventMetadata(
  eventName: string,
  jobName: string | undefined,
  target: any,
  propertyKey: string | symbol
): void {
  const metadata = {
    eventName,
    jobName,
    methodName: propertyKey,
    target,
  };

  const existing = Metadata.get(
    JOB_EVENT_METADATA,
    Reflect
  ) || [];

  Metadata.set(
    JOB_EVENT_METADATA,
    [...existing, metadata],
    Reflect
  );
}

export const OnJobCompleted = createJobEventDecorator('completed');
export const OnJobFailed = createJobEventDecorator('failed');
export const OnJobProgress = createJobEventDecorator('progress');
export const OnJobActive = createJobEventDecorator('active');
export const OnJobWaiting = createJobEventDecorator('waiting');
export const OnJobDelayed = createJobEventDecorator('delayed');
export const OnJobRemoved = createJobEventDecorator('removed');
export const OnJobStalled = createJobEventDecorator('stalled');
