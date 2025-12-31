---
sidebar_position: 6
---

# Logging

Cheetah.js comes with a built-in logger powered by [Pino](https://github.com/pinojs/pino), offering high-performance JSON logging.

## Usage

Inject the `LoggerService` into your controllers or services.

```ts
import { Controller, Get, LoggerService } from '@cheetah.js/core';

@Controller()
export class AppController {
  constructor(private logger: LoggerService) {}

  @Get()
  index() {
    this.logger.info('Request received!');
    this.logger.error('Something went wrong', { error: 'details' });
    return 'Hello';
  }
}
```

## Request Context Logging

For tracking requests across the application, use `RequestLogger`. This service is **request-scoped** and automatically attaches the `trackingId` (from headers or generated) to every log message.

```ts
import { Service, RequestLogger } from '@cheetah.js/core';

@Service({ scope: 'request' })
export class PaymentService {
  constructor(private logger: RequestLogger) {}

  process() {
    // This log will include "trackingId": "..." automatically
    this.logger.info('Processing payment');
  }
}
```

## Configuration

You can configure Pino options via the `Cheetah` constructor.

```ts
new Cheetah({
  logger: {
    level: 'debug',
    // other pino options
  }
}).listen();
```

By default, the logger uses `pino-pretty` for readable console output in development.