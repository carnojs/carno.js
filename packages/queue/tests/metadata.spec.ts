import { describe, test, expect } from 'bun:test';
import { Metadata } from '@carno.js/core';
import {
  QUEUE_METADATA,
  PROCESS_METADATA,
  JOB_EVENT_METADATA,
  QUEUE_EVENT_METADATA,
} from '../src/constants';

describe('Queue Decorators Metadata', () => {
  test('should register Queue decorator metadata', () => {
    // Given: criar decorator manualmente
    const QueueDec = (name: string) => {
      return (target: any) => {
        const metadata = { name, target, options: {} };

        const existing = Metadata.get(QUEUE_METADATA, Reflect) || [];

        Metadata.set(
          QUEUE_METADATA,
          [...existing, metadata],
          Reflect
        );

        return target;
      };
    };

    @QueueDec('metadata-test')
    class TestQueue {}

    // When: obter metadata
    const metadata = Metadata.get(QUEUE_METADATA, Reflect);

    // Then: metadata deve conter a queue
    expect(metadata).toBeDefined();
    expect(Array.isArray(metadata)).toBe(true);

    const found = metadata.find((m: any) => m.name === 'metadata-test');

    expect(found).toBeDefined();
    expect(found.name).toBe('metadata-test');
  });

  test('should register Process decorator metadata', () => {
    // Given: criar decorator manualmente
    const ProcessDec = (name: string) => {
      return (target: any, propertyKey: string | symbol) => {
        const metadata = { name, methodName: propertyKey, target };

        const existing = Metadata.get(PROCESS_METADATA, Reflect) || [];

        Metadata.set(
          PROCESS_METADATA,
          [...existing, metadata],
          Reflect
        );
      };
    };

    class TestQueue {
      @ProcessDec('test-process')
      async processJob() {}
    }

    // When: obter metadata
    const metadata = Metadata.get(PROCESS_METADATA, Reflect);

    // Then: metadata deve conter o processor
    expect(metadata).toBeDefined();
    expect(Array.isArray(metadata)).toBe(true);

    const found = metadata.find((m: any) => m.name === 'test-process');

    expect(found).toBeDefined();
    expect(found.name).toBe('test-process');
    expect(found.methodName).toBe('processJob');
  });

  test('should register OnJobCompleted decorator metadata', () => {
    // Given: criar decorator manualmente
    const OnJobCompletedDec = (jobName?: string) => {
      return (target: any, propertyKey: string | symbol) => {
        const metadata = {
          eventName: 'completed',
          jobName,
          methodName: propertyKey,
          target,
        };

        const existing = Metadata.get(JOB_EVENT_METADATA, Reflect) || [];

        Metadata.set(
          JOB_EVENT_METADATA,
          [...existing, metadata],
          Reflect
        );
      };
    };

    class TestQueue {
      @OnJobCompletedDec('job-type')
      async onCompleted() {}
    }

    // When: obter metadata
    const metadata = Metadata.get(JOB_EVENT_METADATA, Reflect);

    // Then: metadata deve conter o evento
    expect(metadata).toBeDefined();
    expect(Array.isArray(metadata)).toBe(true);

    const found = metadata.find((m: any) => m.eventName === 'completed');

    expect(found).toBeDefined();
    expect(found.eventName).toBe('completed');
    expect(found.jobName).toBe('job-type');
    expect(found.methodName).toBe('onCompleted');
  });

  test('should register OnJobFailed decorator metadata', () => {
    // Given: criar decorator manualmente
    const OnJobFailedDec = () => {
      return (target: any, propertyKey: string | symbol) => {
        const metadata = {
          eventName: 'failed',
          methodName: propertyKey,
          target,
        };

        const existing = Metadata.get(JOB_EVENT_METADATA, Reflect) || [];

        Metadata.set(
          JOB_EVENT_METADATA,
          [...existing, metadata],
          Reflect
        );
      };
    };

    class TestQueue {
      @OnJobFailedDec()
      async onFailed() {}
    }

    // When: obter metadata
    const metadata = Metadata.get(JOB_EVENT_METADATA, Reflect);

    // Then: metadata deve conter o evento
    expect(metadata).toBeDefined();

    const found = metadata.find((m: any) =>
      m.eventName === 'failed' && m.methodName === 'onFailed'
    );

    expect(found).toBeDefined();
    expect(found.eventName).toBe('failed');
  });

  test('should register OnJobProgress decorator metadata', () => {
    // Given: criar decorator manualmente
    const OnJobProgressDec = () => {
      return (target: any, propertyKey: string | symbol) => {
        const metadata = {
          eventName: 'progress',
          methodName: propertyKey,
          target,
        };

        const existing = Metadata.get(JOB_EVENT_METADATA, Reflect) || [];

        Metadata.set(
          JOB_EVENT_METADATA,
          [...existing, metadata],
          Reflect
        );
      };
    };

    class TestQueue {
      @OnJobProgressDec()
      async onProgress() {}
    }

    // When: obter metadata
    const metadata = Metadata.get(JOB_EVENT_METADATA, Reflect);

    // Then: metadata deve conter o evento
    expect(metadata).toBeDefined();

    const found = metadata.find((m: any) =>
      m.eventName === 'progress' && m.methodName === 'onProgress'
    );

    expect(found).toBeDefined();
    expect(found.eventName).toBe('progress');
  });

  test('should register OnQueueCleaned decorator metadata', () => {
    // Given: criar decorator manualmente
    const OnQueueCleanedDec = () => {
      return (target: any, propertyKey: string | symbol) => {
        const metadata = {
          eventName: 'cleaned',
          methodName: propertyKey,
          target,
        };

        const existing = Metadata.get(QUEUE_EVENT_METADATA, Reflect) || [];

        Metadata.set(
          QUEUE_EVENT_METADATA,
          [...existing, metadata],
          Reflect
        );
      };
    };

    class TestQueue {
      @OnQueueCleanedDec()
      async onCleaned() {}
    }

    // When: obter metadata
    const metadata = Metadata.get(QUEUE_EVENT_METADATA, Reflect);

    // Then: metadata deve conter o evento
    expect(metadata).toBeDefined();

    const found = metadata.find((m: any) =>
      m.eventName === 'cleaned' && m.methodName === 'onCleaned'
    );

    expect(found).toBeDefined();
    expect(found.eventName).toBe('cleaned');
  });
});
