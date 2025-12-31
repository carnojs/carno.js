---
sidebar_position: 3
---

# Relationships

Carno.js ORM supports standard relationships using `ManyToOne` and `OneToMany` decorators.

## Concepts

It is crucial to understand the difference between the **Owning Side** and the **Inverse Side**.

| Decorator | Side | Creates Column? | Description |
| :--- | :--- | :--- | :--- |
| **`@ManyToOne`** | Owning | **Yes** | Stores the Foreign Key (e.g., `user_id`). Defines "Belongs To". |
| **`@OneToMany`** | Inverse | No | Virtual property. Used only for querying/loading related data. |

## Example: User and Posts

A **User** has many **Posts**. A **Post** belongs to one **User**.

### 1. The Owning Side (Post)

Use `@ManyToOne` where you want the foreign key column to exist. In this case, the `posts` table will have a `user_id` column.

```ts
// post.entity.ts
import { Entity, Property, BaseEntity, ManyToOne, Ref } from '@carno.js/orm';
import type { User } from './user.entity';

@Entity()
export class Post extends BaseEntity {
  @Property({ isPrimary: true })
  id: number;

  @Property()
  title: string;

  // Creates 'user_id' column in the database
  @ManyToOne(() => User) 
  user: Ref<User>;
}
```

### 2. The Inverse Side (User)

Use `@OneToMany` to define the reverse relationship. This **does not** modify the `users` table. It merely tells the ORM how to find posts belonging to this user.

```ts
// user.entity.ts
import { Entity, Property, BaseEntity, OneToMany, Ref } from '@carno.js/orm';
import type { Post } from './post.entity';

@Entity()
export class User extends BaseEntity {
  @Property({ isPrimary: true })
  id: number;

  @Property()
  name: string;

  // Virtual property for loading posts
  @OneToMany(() => 'Post', (post: Post) => post.user)
  posts: Ref<Post[]>;
}
```

## Loading Relations

Since `@OneToMany` properties are virtual, they are `undefined` by default. You must explicitly load them using the `load` option.

```ts
const users = await userRepository.find({
  load: {
    posts: true // Load the 'posts' relation
  }
});
```

## Setting Relations

To link entities, you must set the property on the **Owning Side** (`@ManyToOne`).

### Option A: Using an Entity Instance
If you already have the user object:

```ts
const user = await userRepository.findById(1);
const post = new Post();
post.title = 'Hello World';
post.user = user; 
await post.save();
```

### Option B: Using `refById` (Recommended for Performance)

If you only have the ID (e.g., from a request parameter) and don't want to waste a database query fetching the full entity just to link it, use `refById`. This creates a lightweight reference that the ORM understands as a foreign key.

```ts
import { refById } from '@carno.js/orm';
import { User } from './user.entity';

const post = new Post();
post.title = 'Efficient Post';

// No database hit! Sets the FK 'user_id' directly using the ID.
post.user = refById(User, 123); 

await post.save();
```