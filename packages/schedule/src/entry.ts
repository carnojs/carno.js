import { Cheetah } from '@cheetah.js/core';
import { SchedulerOrchestration } from './scheduler-orchestration.service';
import { SchedulerRegistry } from './scheduler.registry';

export const CheetahScheduler = new Cheetah({
  exports: [SchedulerOrchestration, SchedulerRegistry]
})