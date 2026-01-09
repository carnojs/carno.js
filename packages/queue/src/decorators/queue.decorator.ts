import { Service, Metadata } from '@carno.js/core';
import { QueueOptions } from '../interfaces';
import { QUEUE_METADATA } from '../constants';

export function Queue(
  name: string,
  options: Omit<QueueOptions, 'name'> = {}
): ClassDecorator {
  return (target: any) => {
    const metadata = {
      name,
      options,
      target,
    };

    const existingMetadata = Metadata.get(
      QUEUE_METADATA,
      Reflect
    ) || [];

    Metadata.set(
      QUEUE_METADATA,
      [...existingMetadata, metadata],
      Reflect
    );

    return Service()(target);
  };
}
