---
sidebar_position: 9
---

# Tracking ID

Cheetah.js includes a built-in mechanism to track requests across your distributed system using a unique ID.

## How it works

1. When a request arrives, the framework looks for the `x-tracking-id` header.
2. If found, it uses that value.
3. If not found, it generates a new UUID v4.
4. The ID is stored in the request `Context`.

## Accessing the Tracking ID

You can access the ID via the `Context` object.

```ts
import { Controller, Get, Context } from '@cheetah.js/core';

@Controller()
export class AppController {
  @Get()
  index(@Context() ctx: Context) {
    return { trackingId: ctx.trackingId };
  }
}
```

## Logging

If you use the `RequestLogger` (see [Logging](./logging)), the `trackingId` is automatically attached to every log entry for that request.

```json
{
  "level": 30,
  "time": 1629823456789,
  "msg": "Processing order",
  "trackingId": "123e4567-e89b-12d3-a456-426614174000"
}
```

This allows you to filter logs by a specific request ID in your logging aggregator (e.g., Datadog, ELK).
