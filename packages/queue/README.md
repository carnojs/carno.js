# @cheetah.js/queue

Queue module for Cheetah framework with BullMQ support.

## Installation

```bash
bun add @cheetah.js/queue
```

## Features

- Queue management with decorators
- Job processing with async/await
- Full BullMQ event support
- Redis configuration (global and per-queue)
- Dependency injection support

## Usage

### Basic Queue and Processor

```typescript
import { Queue, Process } from '@cheetah.js/queue';

@Queue('email')
export class EmailQueue {
  @Process()
  async sendEmail(job: Job) {
    const { to, subject, body } = job.data;
    // Send email logic
    return { sent: true };
  }
}
```

### Job Events

```typescript
import { Queue, Process, OnJobCompleted, OnJobFailed } from '@cheetah.js/queue';

@Queue('notifications')
export class NotificationQueue {
  @Process('send')
  async sendNotification(job: Job) {
    // Process notification
  }

  @OnJobCompleted('send')
  async onCompleted(job: Job, result: any) {
    console.log(`Job ${job.id} completed:`, result);
  }

  @OnJobFailed('send')
  async onFailed(job: Job, error: Error) {
    console.error(`Job ${job.id} failed:`, error);
  }
}
```

### Inject Queue in Services

```typescript
import { Injectable } from '@cheetah.js/core';
import { InjectQueue, QueueClientProxy } from '@cheetah.js/queue';

@Injectable()
export class UserService {
  constructor(
    @InjectQueue('email') private emailQueue: QueueClientProxy
  ) {}

  async createUser(data: any) {
    // Create user logic
    await this.emailQueue.add('welcome', { email: data.email });
  }
}
```

`@InjectQueue` provides a lightweight queue proxy with `add`, `addBulk`, and `getJob`.

## Configuration

```typescript
import { Cheetah } from '@cheetah.js/core';
import { QueueModule } from '@cheetah.js/queue';

const app = new Cheetah();

app.use(QueueModule({
  connection: {
    host: 'localhost',
    port: 6379
  }
}));
```

## License

MIT
