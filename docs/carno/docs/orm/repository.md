---
sidebar_position: 4
---

# Repositories

Repositories provide a dedicated abstraction layer for data access, promoting separation of concerns and cleaner code architecture.

## Creating a Repository

To create a repository, extend the generic `Repository<T>` class and decorate it with `@Service()`.

```typescript
import { Service, Repository } from '@carno.js/orm';
import { User } from '../entities/user.entity';

@Service()
export class UserRepository extends Repository<User> {
  constructor() {
    super(User);
  }

  // Custom method to find users by role
  async findByRole(role: string): Promise<User[]> {
    return this.find({
      where: { role }
    });
  }
}
```

## Using Repositories

Inject the repository into your services or controllers.

```typescript
@Service()
export class UserService {
  constructor(private userRepository: UserRepository) {}

  async getAllAdmins() {
    return this.userRepository.findByRole('admin');
  }
}
```

## Standard Methods

The `Repository` class comes with a comprehensive set of built-in methods for common operations.

### Reading

- **`find(options)`**: Finds multiple entities matching the criteria.
- **`findOne(options)`**: Finds a single entity. Returns `undefined` if not found.
- **`findOneOrFail(options)`**: Finds a single entity. Throws an error if not found.
- **`findAll(options)`**: Finds all entities (wrapper around `find` without required where).
- **`findById(id)`**: Finds an entity by its primary key.
- **`findByIdOrFail(id)`**: Finds an entity by primary key or throws.
- **`exists(where)`**: Checks if at least one entity matches the criteria.
- **`count(where)`**: Returns the count of entities matching the criteria.

### Writing

- **`create(data)`**: Creates and persists a new entity instance immediately.
  ```typescript
  const user = await this.userRepository.create({
    name: 'Alice',
    email: 'alice@example.com'
  });
  ```

- **`update(where, data)`**: Updates entities matching the criteria.
  See [Querying & Operators](./querying) for details on the `where` argument.
  ```typescript
  await this.userRepository.update(
    { id: 1 },
    { name: 'Alice Smith' }
  );
  ```

- **`updateById(id, data)`**: Updates a specific entity by ID.

### Deleting Data

You can delete records using a specific criteria or by ID.

- **`delete(where)`**: Deletes entities matching the criteria.
  See [Querying & Operators](./querying) for supported filters.
  ```typescript
  // Delete all inactive users
  await this.userRepository.delete({ isActive: false });
  ```

- **`deleteById(id)`**: Deletes a specific entity by ID.
  ```typescript
  await this.userRepository.deleteById(5);
  ```

## Query Builder Access

If the standard methods aren't enough, you can access the underlying Query Builder from within a repository.

```typescript
async findRecentUsers() {
  return this.createQueryBuilder()
    .where({ createdAt: { $gt: new Date(Date.now() - 86400000) } })
    .orderBy({ createdAt: 'DESC' })
    .executeAndReturnAll();
}
```
