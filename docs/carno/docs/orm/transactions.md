---
sidebar_position: 5
---

# Transactions

Execute multiple operations within a single database transaction.

## Usage

Inject the `Orm` service and use the `.transaction()` method.

```ts
import { Service, Orm } from '@carno.js/orm';

@Service()
export class PaymentService {
  constructor(private orm: Orm) {}

  async processPayment() {
    await this.orm.transaction(async (tx) => {
      // Operations inside here share the same transaction context
      // If any error is thrown, the transaction is rolled back automatically.
      
      const user = await this.userRepository.findById(1);
      // ... modify user
      await user.save();
    });
  }
}
```

Note: The `Repository` methods automatically detect the running transaction context.