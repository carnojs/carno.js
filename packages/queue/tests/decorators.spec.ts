import { describe, test, expect } from 'bun:test';
import { Metadata } from '@cheetah.js/core';
import {
  QUEUE_METADATA,
  PROCESS_METADATA,
  JOB_EVENT_METADATA,
} from '../src/constants';

describe('Queue Decorators Metadata', () => {
  test('should register queue metadata', () => {
    const Queue = (name: string) => {
      return (target: any) => {
        const existing = Metadata.get(QUEUE_METADATA, Reflect) || [];

        Metadata.set(
          QUEUE_METADATA,
          [...existing, { name, target }],
          Reflect
        );
      };
    };

    @Queue('test-queue')
    class TestQueue {}

    const metadata = Metadata.get(QUEUE_METADATA, Reflect);

    expect(metadata).toBeDefined();

    expect(Array.isArray(metadata)).toBe(true);

    const found = metadata.find((m: any) => m.name === 'test-queue');

    expect(found).toBeDefined();

    expect(found.target).toBe(TestQueue);
  });

  test('should register process metadata', () => {
    const Process = () => {
      return (target: any, propertyKey: string | symbol) => {
        const existing = Metadata.get(PROCESS_METADATA, Reflect) || [];

        Metadata.set(
          PROCESS_METADATA,
          [...existing, { methodName: propertyKey, target }],
          Reflect
        );
      };
    };

    class TestQueue {
      @Process()
      processJob() {}
    }

    const metadata = Metadata.get(PROCESS_METADATA, Reflect);

    expect(metadata).toBeDefined();

    expect(Array.isArray(metadata)).toBe(true);
  });
});
