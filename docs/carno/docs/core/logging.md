---
sidebar_position: 6
---

# Logging

Logging is handled by the dedicated `@carno.js/logger` package, which provides a high-performance, structured logging system.

## Installation

```bash
bun add @carno.js/logger
```

## Basic Usage

Register the logger in your application.

```ts
import { Carno } from '@carno.js/core';
import { CarnoLogger } from '@carno.js/logger';

const app = new Carno();
app.use(CarnoLogger); // Registers LoggerService
```

Now you can inject `LoggerService` into your components.

```ts
import { Service } from '@carno.js/core';
import { LoggerService } from '@carno.js/logger';

@Service()
class UserService {
  constructor(private logger: LoggerService) {}

  createUser() {
    this.logger.info('Creating user...');
    try {
      // ... logic
      this.logger.debug('User created successfully');
    } catch (err) {
      this.logger.error('Failed to create user', err);
    }
  }
}
```

## Configuration

You can configure the logger levels and transport.

```ts
import { CarnoLogger } from '@carno.js/logger';

const LoggerModule = CarnoLogger.configure({
  level: 'debug',
  prettyPrint: process.env.NODE_ENV === 'development'
});

app.use(LoggerModule);
```
