---
sidebar_position: 2
---

# Entities

Entities are classes that map to database tables.

## Defining an Entity

Use the `@Entity()` decorator. By default, the table name is derived from the class name (snake_case).

```ts
import { Entity, Property, BaseEntity } from '@cheetah.js/orm';

@Entity()
export class User extends BaseEntity {
  @Property({ isPrimary: true, autoIncrement: true })
  id: number;

  @Property()
  name: string;

  @Property({ unique: true })
  email: string;

  @Property({ default: true })
  isActive: boolean;
}
```

## Property Options

The `@Property()` decorator accepts options to define column behavior.

| Option | Type | Description |
| :--- | :--- | :--- |
| `isPrimary` | `boolean` | Mark as primary key. |
| `autoIncrement` | `boolean` | Auto-incrementing value. |
| `unique` | `boolean` | Add unique constraint. |
| `nullable` | `boolean` | Allow NULL values. |
| `default` | `any` | Default value. |
| `columnName` | `string` | Custom DB column name. |
| `type` | `string` | Explicit DB type (e.g., `'json'`, `'text'`). |
| `length` | `number` | Column length (varchar). |

## Indexes and Unique Constraints

You can define indexes and unique constraints in three ways: via the `@Property` shorthand, property decorators, or class decorators (for composite keys).

### Shorthand

For simple, single-column indexes, use the options in `@Property`.

```ts
@Entity()
export class User {
  @Property({ unique: true })
  email: string;

  @Property({ index: true })
  status: string;
}
```

### Property Decorators

You can use specific decorators on the properties.

```ts
import { Entity, Property, Index, Unique } from '@cheetah.js/orm';

@Entity()
export class User {
  @Index()
  @Property()
  createdAt: Date;

  @Unique()
  @Property()
  username: string;
}
```

### Composite (Multi-Column)

To define indexes or unique constraints that span **multiple columns**, apply the decorator to the **class**.
These decorators are type-safe and accept a list of property names (`keyof T`).

```ts
import { Entity, Property, Index, Unique } from '@cheetah.js/orm';

@Entity()
@Unique(['email', 'organizationId']) // Composite Unique
@Index({ properties: ['lastName', 'firstName'] }) // Composite Index
export class User {
  @Property()
  email: string;

  @Property()
  organizationId: number;

  @Property()
  firstName: string;

  @Property()
  lastName: string;
}
```

### Partial Indexes (Where Clause)

You can create partial indexes by specifying a `where` condition.

```ts
@Entity()
@Index({ 
  properties: ['email'], 
  where: { isActive: true } // Only index active users
})
export class User {
  // ...
}
```