# @cheetah.js/schedule

Task scheduling plugin for Cheetah.js with support for cron jobs, intervals, and timeouts.

## Features

- Cron-based scheduling
- Interval scheduling
- Timeout scheduling
- Registry for managing scheduled tasks
- Lifecycle hooks (start/stop)

## Installation

```bash
bun add @cheetah.js/schedule
```

## Usage

Add the plugin to your Cheetah.js application:

```typescript
import { Cheetah } from '@cheetah.js/core';
import { CheetahSchedule } from '@cheetah.js/schedule';

new Cheetah()
  .use(CheetahSchedule)
  .listen();
```

## Schedule Tasks

### Cron Jobs

Schedule tasks using cron expressions:

```typescript
import { Service } from '@cheetah.js/core';
import { Schedule } from '@cheetah.js/schedule';

@Service()
export class TaskService {
  @Schedule('*/5 * * * *') // Every 5 minutes
  handleCron() {
    console.log('Task executed every 5 minutes');
  }

  @Schedule('0 0 * * *', { name: 'daily-cleanup' }) // Every day at midnight
  dailyCleanup() {
    console.log('Running daily cleanup');
  }
}
```

### Cron Expression Format

```
* * * * *
│ │ │ │ │
│ │ │ │ └── Day of week (0-7)
│ │ │ └──── Month (1-12)
│ │ └────── Day of month (1-31)
│ └──────── Hour (0-23)
└────────── Minute (0-59)
```

### Common Cron Patterns

```typescript
@Schedule('* * * * *')        // Every minute
@Schedule('*/5 * * * *')      // Every 5 minutes
@Schedule('0 * * * *')        // Every hour
@Schedule('0 0 * * *')        // Every day at midnight
@Schedule('0 0 * * 0')        // Every Sunday at midnight
@Schedule('0 0 1 * *')        // First day of every month
```

### Intervals

Execute tasks at fixed intervals:

```typescript
import { Service } from '@cheetah.js/core';
import { Interval } from '@cheetah.js/schedule';

@Service()
export class TaskService {
  @Interval(5000) // Every 5 seconds
  handleInterval() {
    console.log('Task executed every 5 seconds');
  }

  @Interval(60000, { name: 'health-check' }) // Every minute
  healthCheck() {
    console.log('Health check running');
  }
}
```

### Timeouts

Execute tasks once after a delay:

```typescript
import { Service } from '@cheetah.js/core';
import { Timeout } from '@cheetah.js/schedule';

@Service()
export class TaskService {
  @Timeout(10000) // After 10 seconds
  handleTimeout() {
    console.log('Task executed after 10 seconds');
  }

  @Timeout(5000, { name: 'delayed-init' }) // After 5 seconds
  delayedInit() {
    console.log('Delayed initialization complete');
  }
}
```

## Dynamic Scheduling

Use the `SchedulerRegistry` to manage tasks dynamically:

```typescript
import { Service } from '@cheetah.js/core';
import { SchedulerRegistry } from '@cheetah.js/schedule';

@Service()
export class TaskManager {
  constructor(private schedulerRegistry: SchedulerRegistry) {}

  addDynamicCron() {
    const job = CronJob.from({
      cronTime: '*/10 * * * *',
      onTick: () => console.log('Dynamic cron executed'),
      start: true
    });

    this.schedulerRegistry.addCronJob('my-dynamic-job', job);
  }

  stopTask(name: string) {
    this.schedulerRegistry.deleteCronJob(name);
  }

  listAllJobs() {
    const jobs = this.schedulerRegistry.getCronJobs();
    console.log(`Active jobs: ${jobs.size}`);
  }
}
```

## Options

### Schedule Options

```typescript
interface CronOptions {
  name?: string;           // Task name for identification
  timeZone?: string;       // Timezone (e.g., 'America/New_York')
  utcOffset?: number;      // UTC offset alternative to timeZone
  unrefTimeout?: boolean;  // Don't keep process alive
  disabled?: boolean;      // Start disabled
}

@Schedule('* * * * *', {
  name: 'my-task',
  timeZone: 'America/Los_Angeles',
  disabled: false
})
handleTask() {
  // Task logic
}
```

### Interval Options

```typescript
@Interval(5000, { name: 'my-interval' })
```

### Timeout Options

```typescript
@Timeout(10000, { name: 'my-timeout' })
```

## Lifecycle

Tasks are automatically:
- Started when the application initializes
- Stopped when the application shuts down

Override lifecycle behavior:

```typescript
@Schedule('* * * * *', { disabled: true })
myTask() {
  // This task won't start automatically
}
```

## Best Practices

1. **Use descriptive names** for tasks to easily identify them
2. **Avoid long-running tasks** in cron jobs - use queues for heavy operations
3. **Use timeouts carefully** - they execute only once
4. **Consider timezones** when scheduling tasks
5. **Monitor task execution** using logging

## Example: Complete Task Service

```typescript
import { Service } from '@cheetah.js/core';
import { Schedule, Interval, Timeout } from '@cheetah.js/schedule';

@Service()
export class BackgroundTasks {
  @Schedule('0 0 * * *', { name: 'database-backup' })
  backupDatabase() {
    console.log('Starting database backup');
    // Backup logic
  }

  @Schedule('*/15 * * * *', { name: 'cache-cleanup' })
  cleanupCache() {
    console.log('Cleaning up expired cache entries');
    // Cache cleanup logic
  }

  @Interval(30000, { name: 'health-check' })
  healthCheck() {
    console.log('Performing health check');
    // Health check logic
  }

  @Timeout(5000, { name: 'startup-task' })
  onStartup() {
    console.log('Running startup tasks');
    // Initialization logic
  }
}
```

## License

MIT
