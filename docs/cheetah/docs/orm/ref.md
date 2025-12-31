---
sidebar_position: 7
---

# References (Ref)

Cheetah.js ORM uses a clever type trick to handle **circular dependencies** between entities without runtime overhead.

## The Problem

When two entities import each other (e.g., User has many Posts, Post belongs to User), you often face circular dependency errors in TypeScript or at runtime.

## The Solution: `Ref<T>`

Instead of typing a property as `User`, type it as `Ref<User>` and use `import type`.

```ts
import type { User } from './user.entity'; // Type-only import
import { Ref, Entity, ManyToOne } from '@cheetah.js/orm';

@Entity()
export class Post {
  @ManyToOne('User')
  author: Ref<User>;
}
```

At runtime, `Ref<T>` is simply `T`. It's a type alias.

## Helper Functions

### `refById(Class, id)`

Creates a lightweight reference object with just the ID. Useful for setting relationships without fetching the full object.

```ts
import { refById } from '@cheetah.js/orm';
import { User } from './user.entity';

// Set author by ID (no DB query needed)
const post = new Post();
post.author = refById(User, 123);
await post.save();
```

**Note:** `refById` creates an instance and sets the `id` property. Ensure your entity follows the convention of having an `id` primary key.

### `isLoaded(ref)`

Checks if a reference is not null/undefined.

```ts
if (isLoaded(post.author)) {
  console.log(post.author.name);
}
```

### `unwrap(ref)`

Returns the entity. Since `Ref<T>` is `T`, this is an identity function, but it can be useful for type narrowing or clarity.