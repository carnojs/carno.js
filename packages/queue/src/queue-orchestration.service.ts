import {
  Service,
  OnApplicationInit,
  OnApplicationShutdown,
  InjectorService,
} from '@cheetah.js/core';
import { QueueRegistry } from './queue.registry';
import { QueueDiscoveryService } from './services/queue-discovery.service';
import { QueueBuilderService } from './services/queue-builder.service';
import { EventBinderService } from './services/event-binder.service';
import { getQueueToken } from './decorators/inject-queue.decorator';

@Service()
export class QueueOrchestration {
  constructor(
    private queueRegistry: QueueRegistry,
    private discoveryService: QueueDiscoveryService,
    private builderService: QueueBuilderService,
    private eventBinder: EventBinderService,
    private injector: InjectorService
  ) {}

  @OnApplicationInit()
  async onApplicationInit(): Promise<void> {
    this.setupQueues();
  }

  @OnApplicationShutdown()
  async onApplicationShutdown(): Promise<void> {
    await this.queueRegistry.closeAll();
  }

  private setupQueues(): void {
    const queues = this.discoveryService.discoverQueues();

    queues.forEach(queueMetadata => {
      try {
        this.setupQueue(queueMetadata);
      } catch (error) {
        if (this.isProviderNotFoundError(error)) {
          return;
        }

        throw error;
      }
    });
  }

  private isProviderNotFoundError(error: any): boolean {
    return error?.message?.includes('Provider not found');
  }

  private setupQueue(queueMetadata: any): void {
    const queue = this.createQueue(queueMetadata);

    this.registerQueueProvider(queueMetadata.name, queue);

    this.setupProcessors(queueMetadata);

    this.setupQueueEvents(queueMetadata, queue);
  }

  private createQueue(metadata: any): any {
    return this.builderService.createQueue(
      metadata.name,
      metadata.options
    );
  }

  private setupProcessors(queueMetadata: any): void {
    const processors = this.findProcessors(queueMetadata);

    console.log(`🔍 Setting up processors for queue "${queueMetadata.name}": found ${processors.length} processor(s)`);

    if (processors.length === 0) {
      console.log(`⚠️  No processors found for queue "${queueMetadata.name}", skipping worker creation`);
      return;
    }

    console.log(`🏗️  Creating unified worker for queue "${queueMetadata.name}"`);
    this.createUnifiedWorker(queueMetadata, processors);
  }

  private findProcessors(queueMetadata: any): any[] {
    const all = this.discoveryService.discoverProcessors();

    console.log(`🔍 Total processors discovered: ${all.length}`);
    console.log(`🔍 Looking for processors for queue: ${queueMetadata.name}`);
    console.log(`🔍 Queue target.prototype:`, queueMetadata.target.prototype);

    const filtered = all.filter(p => {
      const matches = p.target === queueMetadata.target.prototype;
      console.log(`  - Processor "${p.name || 'default'}" (method: ${p.methodName}): ${matches ? '✅ MATCH' : '❌ no match'}`);
      return matches;
    });

    return filtered;
  }

  private createUnifiedWorker(
    queueMetadata: any,
    processors: any[]
  ): void {
    console.log(`🏗️  Creating unified worker for "${queueMetadata.name}" with ${processors.length} processor(s)`);

    const instance = this.getOrCreateInstance(queueMetadata);
    console.log(`✅ Queue instance created:`, instance.constructor.name);

    const processorMap = this.buildProcessorMap(
      instance,
      processors
    );
    console.log(`✅ Processor map built with ${processorMap.size} entries:`, Array.from(processorMap.keys()));

    const routerProcessor = this.createRouterProcessor(processorMap);

    const maxConcurrency = this.calculateMaxConcurrency(processors);
    console.log(`✅ Max concurrency calculated: ${maxConcurrency}`);

    const worker = this.builderService.createWorker(
      queueMetadata.name,
      queueMetadata.name,
      routerProcessor,
      { concurrency: maxConcurrency }
    );
    console.log(`✅ Worker created for queue "${queueMetadata.name}"`);

    this.setupAllJobEvents(
      queueMetadata,
      worker,
      instance,
      processors
    );
    console.log(`✅ Job events setup complete for queue "${queueMetadata.name}"`);
  }

  private buildWorkerId(queueName: string, jobName: string): string {
    return `${queueName}:${jobName}`;
  }

  private getOrCreateInstance(metadata: any): any {
    return this.injector.invoke(metadata.target);
  }

  private createProcessorFunction(
    instance: any,
    metadata: any
  ): any {
    return instance[metadata.methodName].bind(instance);
  }

  private buildProcessorMap(
    instance: any,
    processors: any[]
  ): Map<string, Function> {
    const map = new Map<string, Function>();

    processors.forEach(processor => {
      const jobName = processor.name || '__default__';
      const fn = instance[processor.methodName].bind(instance);
      map.set(jobName, fn);
    });

    return map;
  }

  private createRouterProcessor(
    processorMap: Map<string, Function>
  ): (job: any) => Promise<any> {
    return async (job: any) => {
      const jobName = job.name;
      const processor = processorMap.get(jobName);

      if (!processor) {
        const defaultProcessor = processorMap.get('__default__');

        if (defaultProcessor) {
          return defaultProcessor(job);
        }

        throw new Error(
          `No processor found for job "${jobName}"`
        );
      }

      return processor(job);
    };
  }

  private calculateMaxConcurrency(processors: any[]): number {
    const concurrencies = processors
      .map(p => p.concurrency ?? 1)
      .filter(c => typeof c === 'number');

    if (concurrencies.length === 0) {
      return 1;
    }

    return Math.max(...concurrencies);
  }

  private setupAllJobEvents(
    queueMetadata: any,
    worker: any,
    instance: any,
    processors: any[]
  ): void {
    const allEvents = processors.flatMap(processor => {
      return this.findJobEvents(queueMetadata, processor);
    });

    const uniqueEvents = this.deduplicateEvents(allEvents);

    this.eventBinder.bindJobEvents(worker, uniqueEvents, instance);
  }

  private deduplicateEvents(events: any[]): any[] {
    const seen = new Set<string>();
    const unique: any[] = [];

    events.forEach(event => {
      const key = `${event.eventName}:${event.methodName}`;

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(event);
      }
    });

    return unique;
  }

  private setupJobEvents(
    queueMetadata: any,
    worker: any,
    instance: any,
    processorMetadata: any
  ): void {
    const events = this.findJobEvents(
      queueMetadata,
      processorMetadata
    );

    this.eventBinder.bindJobEvents(worker, events, instance);
  }

  private findJobEvents(
    queueMetadata: any,
    processorMetadata: any
  ): any[] {
    const all = this.discoveryService.discoverJobEvents();

    return all.filter(e => {
      return this.isEventForProcessor(
        e,
        queueMetadata,
        processorMetadata
      );
    });
  }

  private isEventForProcessor(
    event: any,
    queueMetadata: any,
    processorMetadata: any
  ): boolean {
    const sameTarget = event.target === queueMetadata.target.prototype;

    const sameJob = !event.jobName ||
      event.jobName === processorMetadata.name;

    return sameTarget && sameJob;
  }

  private setupQueueEvents(
    queueMetadata: any,
    queue: any
  ): void {
    const events = this.findQueueEvents(queueMetadata);

    const instance = this.getOrCreateInstance(queueMetadata);

    this.eventBinder.bindQueueEvents(queue, events, instance);
  }

  private findQueueEvents(queueMetadata: any): any[] {
    const all = this.discoveryService.discoverQueueEvents();

    return all.filter(e => {
      return e.target === queueMetadata.target.prototype;
    });
  }

  private registerQueueProvider(name: string, queue: any): void {
    const token = getQueueToken(name);

    this.injector.container.addProvider(token, {
      provide: token,
      useValue: () => queue,
      instance: queue,
    });
  }
}
