import { Injectable, Metadata } from '@carno.js/core';
import {
  QUEUE_METADATA,
  PROCESS_METADATA,
  JOB_EVENT_METADATA,
  QUEUE_EVENT_METADATA,
} from '../constants';

@Injectable()
export class QueueDiscoveryService {
  discoverQueues(): any[] {
    return this.getMetadata(QUEUE_METADATA);
  }

  discoverProcessors(): any[] {
    return this.getMetadata(PROCESS_METADATA);
  }

  discoverJobEvents(): any[] {
    return this.getMetadata(JOB_EVENT_METADATA);
  }

  discoverQueueEvents(): any[] {
    return this.getMetadata(QUEUE_EVENT_METADATA);
  }

  private getMetadata(key: string): any[] {
    return Metadata.get(key, Reflect) || [];
  }
}
