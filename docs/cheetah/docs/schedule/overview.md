---
sidebar_position: 1
---

# Schedule

Schedule recurring tasks easily using Cron expressions, intervals, or timeouts.

## Installation

```bash
bun install @cheetah.js/schedule
```

## Setup

Register the module in your application.

```ts
import { Cheetah } from '@cheetah.js/core';
import { CheetahScheduler } from '@cheetah.js/schedule';

const app = new Cheetah()
  .use(CheetahScheduler);

await app.listen(3000);
```

## Usage

Decorate methods in your services with scheduling decorators.

```ts
import { Service } from '@cheetah.js/core';
import { Schedule, Interval, Timeout } from '@cheetah.js/schedule';

@Service()
export class TasksService {
  
  // Run every minute
  @Schedule('* * * * *')
  handleCron() {
    console.log('Called every minute');
  }

  // Run every 10 seconds
  @Interval(10000)
  handleInterval() {
    console.log('Called every 10 seconds');
  }

  // Run once after 5 seconds
  @Timeout(5000)
  handleTimeout() {
    console.log('Called once after 5 seconds');
  }
}
```