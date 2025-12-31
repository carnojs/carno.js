---
sidebar_position: 1
---

# Testing

Carno.js provides utilities to test your application in an integrated environment.

## Installation

The testing utilities are included in `@carno.js/core`.

## Integration Testing

Use `createCoreTestHarness` or `withCoreApplication` to spin up a test instance of your application.

```ts
import { describe, it, expect } from 'bun:test';
import { withCoreApplication } from '@carno.js/core/testing';
import { Carno } from '@carno.js/core';

describe('App', () => {
  it('should return 200 OK', async () => {
    await withCoreApplication(async (harness) => {
      // Make a request to the running server
      const response = await harness.request('/health');
      
      expect(response.status).toBe(200);
      
      // Resolve services from the internal injector
      const myService = harness.resolve(MyService);
      expect(myService).toBeDefined();

    }, {
      config: {
        // Test configuration
        providers: [MyService]
      },
      listen: true // Start HTTP server
    });
  });
});
```

## Harness API

The `harness` object provides:

- `app`: The `Carno` instance.
- `injector`: Access to the DI container.
- `resolve(token)`: Get a provider instance.
- `request(url, init)`: Fetch wrapper for testing HTTP endpoints.
- `close()`: Manually close the app (handled automatically by `withCoreApplication`).