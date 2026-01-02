---
sidebar_position: 6
---

# Logging

Carno.js comes with a built-in logger powered by [Pino](https://github.com/pinojs/pino), offering high-performance JSON logging.

## Usage

Inject the `LoggerService` into your controllers or services.

```ts
import { Controller, Get, LoggerService } from '@carno.js/core';

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

## Configuration

You can configure Pino options via the `Carno` constructor.

```ts
new Carno({
  logger: {
    level: 'debug',
    // other pino options
  }
}).listen();
```

By default, the logger uses `pino-pretty` for readable console output in development.
