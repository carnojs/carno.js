import { Carno } from '@carno.js/core';
import { SchedulerOrchestration } from './scheduler-orchestration.service';
import { SchedulerRegistry } from './scheduler.registry';

export const CarnoScheduler = new Carno({
  exports: [SchedulerOrchestration, SchedulerRegistry]
})