import { Carno } from '@carno.js/core';
import { QueueOrchestration } from './queue-orchestration.service';
import { QueueRegistry } from './queue.registry';
import { QueueDiscoveryService } from './services/queue-discovery.service';
import { QueueBuilderService } from './services/queue-builder.service';
import { EventBinderService } from './services/event-binder.service';
import { ConnectionManagerService } from './services/connection-manager.service';
import { QueueModuleOptions } from './interfaces';
import { QUEUE_MODULE_OPTIONS } from './constants';

export function CarnoQueue(options: QueueModuleOptions = {}) {
  const connectionManager = new ConnectionManagerService();

  connectionManager.setDefaultConnection(options.connection);

  return new Carno({
    providers: [
      {
        provide: QUEUE_MODULE_OPTIONS,
        useValue: options,
      },
      {
        provide: ConnectionManagerService,
        useValue: () => connectionManager,
      },
    ],
    exports: [
      QueueOrchestration,
      QueueRegistry,
      QueueDiscoveryService,
      QueueBuilderService,
      EventBinderService,
      ConnectionManagerService,
    ],
  });
}
