---
sidebar_position: 1
---

# Queue

Cheetah.js integrates [BullMQ](https://docs.bullmq.io/) for robust background job processing.

## Installation

```bash
bun install @cheetah.js/queue
```

## Setup

Register the module in your application.

```ts
import { Cheetah } from '@cheetah.js/core';
import { CheetahQueue } from '@cheetah.js/queue';

const app = new Cheetah()
  .use(CheetahQueue({
    connection: {
      host: 'localhost',
      port: 6379
    }
  }));

await app.listen(3000);
```

## Creating a Queue

Use the `@Queue()` decorator to define a processor for a named queue.

```ts
import { Queue, Process } from '@cheetah.js/queue';
import { Job } from 'bullmq';

@Queue('email')
export class EmailConsumer {
  
  @Process('send-welcome')
  async sendWelcomeEmail(job: Job) {
    console.log(`Sending email to ${job.data.email}`);
    // logic...
  }
}
```

## Adding Jobs

Inject the queue into your services using `@InjectQueue()`.

```ts
import { Service } from '@cheetah.js/core';
import { InjectQueue, BullQueue } from '@cheetah.js/queue';

@Service()
export class AuthService {
  constructor(
    @InjectQueue('email') private emailQueue: BullQueue
  ) {}

  async register(user: User) {
    // ... create user
    await this.emailQueue.add('send-welcome', {
      email: user.email
    });
  }
}
```

## Events

You can listen to queue events (like completed, failed) using decorators.

```ts
import { Queue, OnQueueCompleted } from '@cheetah.js/queue';

@Queue('email')
export class EmailConsumer {
  
  @OnQueueCompleted()
  onCompleted(job: Job) {
    console.log(`Job ${job.id} completed!`);
  }
}
```