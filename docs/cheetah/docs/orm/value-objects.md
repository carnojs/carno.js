---
sidebar_position: 8
---

# Value Objects

Value Objects (VOs) are objects that matter only as the combination of their properties. Two Value Objects with the same values are considered equal.

In Cheetah.js ORM, Value Objects are first-class citizens. They encapsulate validation logic and can be used directly as entity properties.

## Creating a Value Object

To create a custom Value Object, extend the abstract `ValueObject<T, Vo>` class. You must implement the `validate` method.

### Example: Email VO

```ts
import { ValueObject } from '@cheetah.js/orm';

// <Type of raw value, The Class itself>
export class Email extends ValueObject<string, Email> {
  
  // Optional: Define database constraints
  protected max = 255;

  protected validate(value: string): boolean {
    // Return true if valid, false otherwise
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }
}
```

### Example: Age VO

```ts
import { ValueObject } from '@cheetah.js/orm';

export class Age extends ValueObject<number, Age> {
  protected min = 0;
  protected max = 150;

  protected validate(value: number): boolean {
    return Number.isInteger(value);
  }
}
```

## Using in Entities

Use the standard `@Property()` decorator. The ORM automatically detects that the type is a `ValueObject` and handles serialization/deserialization.

```ts
import { Entity, Property, BaseEntity } from '@cheetah.js/orm';
import { Email } from './values/email.vo';
import { Age } from './values/age.vo';

@Entity()
export class User extends BaseEntity {
  @Property()
  email: Email;

  @Property()
  age: Age;
}
```

## Creating Instances

Value Objects enforce validation upon instantiation. If the value is invalid, it throws an `HttpException` (Status 400).

```ts
// Valid
const email = new Email('user@example.com');
console.log(email.getValue()); // 'user@example.com'

// Factory method
const age = Age.from(25);

// Invalid - Throws Error
const invalid = new Email('not-an-email');
```

## Database Mapping

When saving to the database:
1. The ORM calls `.getValue()` to extract the raw primitive (string, number, etc.).
2. That raw value is stored in the column.

When loading from the database:
1. The ORM instantiates the Value Object with the raw value from the column.
2. Validation runs again (ensuring data integrity).

## Built-in Constraints

The `ValueObject` class supports declarative constraints that are checked during instantiation:

- `max`: Max length (string) or max value (number).
- `min`: Min length (string) or min value (number).
- `precision`: Total digits (for numbers).
- `scale`: Decimal digits (for numbers).

If these are set in the class, they are also used to configure the database column definition (e.g., `VARCHAR(255)` if `max = 255`).
