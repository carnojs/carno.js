import { Metadata } from '@cheetah.js/core';
import { ProcessOptions } from '../interfaces';
import { PROCESS_METADATA } from '../constants';

export function Process(
  nameOrOptions?: string | ProcessOptions
): MethodDecorator {
  return (target, propertyKey) => {
    const options = normalizeOptions(nameOrOptions);

    const metadata = {
      ...options,
      methodName: propertyKey,
      target,
    };

    const existingMetadata = Metadata.get(
      PROCESS_METADATA,
      Reflect
    ) || [];

    Metadata.set(
      PROCESS_METADATA,
      [...existingMetadata, metadata],
      Reflect
    );
  };
}

function normalizeOptions(
  nameOrOptions?: string | ProcessOptions
): ProcessOptions {
  if (!nameOrOptions) {
    return {};
  }

  if (typeof nameOrOptions === 'string') {
    return { name: nameOrOptions };
  }

  return nameOrOptions;
}
