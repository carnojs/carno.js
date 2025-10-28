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
      this.setupQueue(queueMetadata);
    });
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

    processors.forEach(processor => {
      this.createWorker(queueMetadata, processor);
    });
  }

  private findProcessors(queueMetadata: any): any[] {
    const all = this.discoveryService.discoverProcessors();

    return all.filter(p => {
      return p.target === queueMetadata.target.prototype;
    });
  }

  private createWorker(
    queueMetadata: any,
    processorMetadata: any
  ): void {
    const instance = this.getOrCreateInstance(queueMetadata);

    const processor = this.createProcessorFunction(
      instance,
      processorMetadata
    );

    const workerId = this.buildWorkerId(
      queueMetadata.name,
      processorMetadata.name
    );

    const worker = this.builderService.createWorker(
      queueMetadata.name,
      workerId,
      processor,
      processorMetadata
    );

    this.setupJobEvents(
      queueMetadata,
      worker,
      instance,
      processorMetadata
    );
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
