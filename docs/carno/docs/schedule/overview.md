---
sidebar_position: 1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Schedule

Schedule recurring tasks easily using Cron expressions, intervals, or timeouts.

## Installation

<Tabs groupId="os">
  <TabItem value="mac" label="macOS / Linux">
    ```bash
    bun install @carno.js/schedule
    ```
  </TabItem>
  <TabItem value="windows" label="Windows">
    ```bash
    bun install "@carno.js/schedule"
    ```
  </TabItem>
</Tabs>

## Setup

Register the module in your application.

```ts
import { Carno } from '@carno.js/core';
import { CarnoScheduler } from '@carno.js/schedule';

const app = new Carno()
  .use(CarnoScheduler);

await app.listen(3000);
```

## Usage

Decorate methods in your services with scheduling decorators.

```ts
import { Service } from '@carno.js/core';
import { Schedule, Interval, Timeout } from '@carno.js/schedule';

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
