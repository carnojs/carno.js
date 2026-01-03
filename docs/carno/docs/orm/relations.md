---
sidebar_position: 8
---

# Relations

Relations define how entities are connected to each other.

## defining Relations

To define a relationship, you use decorators like `@OneToMany` or `@ManyToOne`.

Below is an example of a `User` entity that has many `Post` entities.

### Parent Entity (User)

```ts
import { Entity, Property, OneToMany, BaseEntity } from '@carno.js/orm';
import { Post } from './Post';

@Entity()
export class User extends BaseEntity {
  @Property({ isPrimary: true, autoIncrement: true })
  id: number;

  @Property()
  name: string;

  // Defines that one user has many posts
  @OneToMany(() => Post, (post) => post.user)
  posts: Post[];
}
```

### Child Entity (Post)

```ts
import { Entity, Property, ManyToOne, BaseEntity } from '@carno.js/orm';
import { User } from './User';

@Entity()
export class Post extends BaseEntity {
  @Property({ isPrimary: true, autoIncrement: true })
  id: number;

  @Property()
  title: string;

  // Defines that many posts belong to one user
  @ManyToOne(() => User, (user) => user.posts)
  user: User;
}
```

## Loading Strategies

When loading relations, you can choose between two strategies: `joined` (default) or `select`.

- **Joined**: Loads the relation in the same query using a `JOIN`.
- **Select**: Loads the relation in a separate query (`N+1` protection is handled by `IN` clause optimization where possible).

You can specify the strategy in the query options.

```typescript
const users = await User.find({
  load: ['posts'],
  loadStrategy: 'select' // or 'joined'
});
```

## Nested Relationship Filtering

When you query based on a field of a related entity, Carno ORM **automatically** joins the required table to perform the filter.

This happens regardless of whether you requested the relation to be loaded in the result set or not.

```typescript
// Finds users who have posts with title "Hello World"
const users = await User.find({
  where: {
    posts: { title: 'Hello World' }
  }
});
```

The ORM will automatically generate a `JOIN` to the `posts` table and apply the condition.

> **Note**: This behavior defaults to using the `joined` strategy logic for the purpose of the WHERE clause, ensuring the filter is applied efficiently in the database using a single query structure.