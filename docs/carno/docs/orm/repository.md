---
sidebar_position: 4
---

# Repositories

Repositories provide an abstraction layer to access your database.

## Creating a Repository

Extend the `Repository<T>` class and decorate it with `@Service()`.

```ts
import { Service, Repository } from '@carno.js/orm';
import { User } from '../entities/user.entity';

@Service()
export class UserRepository extends Repository<User> {
  constructor() {
    super(User);
  }

  async findActiveUsers() {
    return this.find({
      where: { isActive: true }
    });
  }
}
```

## Basic Methods

The `Repository` class provides standard CRUD methods:

- `find(options)`: Find multiple entities.
- `findOne(options)`: Find a single entity.
- `findOneOrFail(options)`: Find one or throw error.
- `findById(id)`: Find by primary key.
- `create(data)`: Create a new entity instance (does not save).
- `update(where, data)`: Update records.
- `delete(where)`: Delete records.
- `count(where)`: Count records.
- `exists(where)`: Check existence.

## Querying

```ts
const users = await this.userRepository.find({
  where: {
    age: 18,
    isActive: true
  },
  orderBy: {
    name: 'ASC'
  },
  limit: 10
});
```