import { afterAll, beforeEach, describe, expect, it } from "bun:test";

import {
  GlobalProvider,
  InjectorService,
  Metadata,
  createContainer,
  createInjector,
  registerProvider,
} from "@cheetah.js/core";
import Memoirist from "@cheetah.js/core/route/memoirist";

import { SchedulerOrchestration } from "../src/scheduler-orchestration.service";
import { SchedulerRegistry } from "../src/scheduler.registry";
import { Schedule } from "../src/decorator/schedule.decorator";
import {
  SCHEDULE_CRON_OPTIONS,
  SCHEDULE_INTERVAL_OPTIONS,
  SCHEDULE_TIMEOUT_OPTIONS,
} from "../src/utils/constants";

type ProviderEntry = [unknown, any];

const cronJobName = "scheduler-orchestration-test-cron";
const invocationFlag = "invoked";

const baselineCronMetadata = snapshotMetadata(SCHEDULE_CRON_OPTIONS);
const baselineIntervalMetadata = snapshotMetadata(SCHEDULE_INTERVAL_OPTIONS);
const baselineTimeoutMetadata = snapshotMetadata(SCHEDULE_TIMEOUT_OPTIONS);
const baselineProviders = snapshotProviders();

class SampleScheduledService {
  public readonly events: string[] = [];

  @Schedule("* * * * * *", { name: cronJobName, disabled: true })
  async handle(): Promise<void> {
    this.events.push(invocationFlag);
  }
}

registerProvider({
  provide: SampleScheduledService,
  useClass: SampleScheduledService,
});

const sampleCronEntries = selectServiceEntries();

describe("SchedulerOrchestration", () => {
  beforeEach(() => {
    isolateScheduleMetadata();

    resetServiceInstance();
  });

  /**it('binds cron job execution to the service instance', async () => {
        const orchestrationContext = await givenSchedulerOrchestration();

        await whenCronJobRuns(orchestrationContext);

        thenServiceRecordedInvocation();
    });

    it('reuses existing service instance when scheduled task runs', async () => {
        const orchestrationContext = await givenSchedulerOrchestration();

        const presetInstance = new SampleScheduledService();
        presetInstance.events.push('preset');
        assignServiceInstance(presetInstance);

        await whenCronJobRuns(orchestrationContext);

        thenServiceInstanceWasReused(presetInstance);
    });*/
});

afterAll(() => {
  restoreMetadata(SCHEDULE_CRON_OPTIONS, baselineCronMetadata);
  restoreMetadata(SCHEDULE_INTERVAL_OPTIONS, baselineIntervalMetadata);
  restoreMetadata(SCHEDULE_TIMEOUT_OPTIONS, baselineTimeoutMetadata);

  restoreProviders(baselineProviders);
});

function snapshotMetadata(key: string) {
  const entries = Metadata.get(key, Reflect);

  if (!entries) {
    return [];
  }

  return [...entries];
}

function restoreMetadata(key: string, entries: any[]) {
  Metadata.set(key, [...entries], Reflect);
}

function snapshotProviders(): ProviderEntry[] {
  return Array.from(GlobalProvider.entries());
}

function restoreProviders(entries: ProviderEntry[]) {
  GlobalProvider.clear();

  for (const [token, provider] of entries) {
    GlobalProvider.set(token, provider);
  }
}

function selectServiceEntries() {
  const entries = Metadata.get(SCHEDULE_CRON_OPTIONS, Reflect) || [];

  return entries
    .filter(
      (entry: any) =>
        entry.methodName === "handle" &&
        entry.target === SampleScheduledService.prototype
    )
    .map((entry: any) => ({
      ...entry,
      options: { ...entry.options },
    }));
}

function isolateScheduleMetadata() {
  Metadata.set(SCHEDULE_CRON_OPTIONS, cloneEntries(sampleCronEntries), Reflect);
  Metadata.set(SCHEDULE_INTERVAL_OPTIONS, [], Reflect);
  Metadata.set(SCHEDULE_TIMEOUT_OPTIONS, [], Reflect);
}

function cloneEntries(entries: any[]) {
  return entries.map((entry: any) => ({
    ...entry,
    options: { ...entry.options },
  }));
}

function resetServiceInstance() {
  const provider = GlobalProvider.get(SampleScheduledService);

  if (!provider) {
    return;
  }

  provider.instance = undefined;
}

async function givenSchedulerOrchestration() {
  const injector = await buildInjector();
  const registry = new SchedulerRegistry();

  return {
    injector,
    registry,
    orchestration: new SchedulerOrchestration(registry, injector),
  };
}

async function buildInjector(): Promise<InjectorService> {
  const injector = createInjector();

  await injector.loadModule(
    createContainer(),
    {
      providers: [
        SampleScheduledService,
        SchedulerOrchestration,
        SchedulerRegistry,
      ],
    },
    new Memoirist()
  );

  return injector;
}

async function whenCronJobRuns(context: {
  orchestration: SchedulerOrchestration;
  registry: SchedulerRegistry;
}) {
  context.orchestration.onApplicationInit();

  const cronJob = context.registry.getCronJob(cronJobName);

  await cronJob.fireOnTick();
}

function thenServiceRecordedInvocation() {
  const provider = GlobalProvider.get(SampleScheduledService);

  expect(provider?.instance.events).toEqual([invocationFlag]);
}

function assignServiceInstance(instance: SampleScheduledService) {
  const provider = GlobalProvider.get(SampleScheduledService);

  if (!provider) {
    throw new Error("SampleScheduledService provider not registered");
  }

  provider.instance = instance;
}

function thenServiceInstanceWasReused(instance: SampleScheduledService) {
  const provider = GlobalProvider.get(SampleScheduledService);

  expect(provider?.instance).toBe(instance);
  expect(instance.events).toEqual(["preset", invocationFlag]);
}
