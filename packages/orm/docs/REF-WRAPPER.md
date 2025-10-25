# Ref<T> - Transparent Wrapper for Circular Dependencies

## Overview

`Ref<T>` is a transparent type wrapper that solves circular dependency issues in TypeScript entity definitions while maintaining zero runtime overhead and full type safety.

## Problem: Circular Dependencies

When defining entity relationships, you often encounter circular dependencies:

```typescript
// User.ts
import { Post } from './Post';

@Entity()
export class User extends BaseEntity {
  @PrimaryKey()
  id: number;

  @OneToMany(() => Post, post => post.author)
  posts: Post[];  // ❌ Circular dependency!
}

// Post.ts
import { User } from './User';

@Entity()
export class Post extends BaseEntity {
  @PrimaryKey()
  id: number;

  @ManyToOne(() => User)
  author: User;  // ❌ Circular dependency!
}
```

This causes TypeScript compilation errors or module resolution issues.

## Solution: Ref<T>

`Ref<T>` is a **transparent wrapper** that breaks the circular dependency chain:

```typescript
// User.ts
import type { Post } from './Post';  // ✅ Type-only import

@Entity()
export class User extends BaseEntity {
  @PrimaryKey()
  id: number;

  @OneToMany(() => Post, post => post.author)
  posts: Ref<Post>[];  // ✅ No circular dependency!
}

// Post.ts
import type { User } from './User';  // ✅ Type-only import

@Entity()
export class Post extends BaseEntity {
  @PrimaryKey()
  id: number;

  @ManyToOne(() => User)
  author: Ref<User>;  // ✅ No circular dependency!
}
```

## Key Features

### 1. Transparent at Runtime

`Ref<T>` is just a type alias - **it's literally the same as `T` at runtime**:

```typescript
type Ref<T> = T;  // Identity type
```

This means:
- ✅ Zero runtime overhead
- ✅ No wrapper objects created
- ✅ Direct property access
- ✅ Same memory footprint

### 2. Type-Only Imports

Use `import type` to import referenced entities:

```typescript
// Type-only import - doesn't create runtime dependency
import type { User } from './User';

@Entity()
export class Post extends BaseEntity {
  @ManyToOne()
  author: Ref<User>;  // Works perfectly!
}
```

### 3. Full Type Safety

TypeScript treats `Ref<User>` exactly like `User`:

```typescript
const post = await Post.findOne({ id: 1 });

// All properties accessible directly
console.log(post.author.name);      // ✅ Type-safe
console.log(post.author.email);     // ✅ Type-safe
console.log(post.author.invalidProp); // ❌ Compile error
```

## API Reference

### Type: `Ref<T>`

Transparent wrapper type for entity references.

```typescript
type Ref<T> = T;
```

**Usage:**
```typescript
@ManyToOne()
author: Ref<User>;

@OneToMany(() => Post, post => post.author)
posts: Ref<Post>[];
```

---

### Function: `ref<T>(entity: T): Ref<T>`

Identity function to create a reference explicitly.

```typescript
const user = new User();
const userRef = ref(user);  // userRef === user (same reference)
```

**Use Cases:**
- Explicit ref creation for clarity
- API consistency when working with refs
- Documentation purposes

---

### Function: `unwrap<T>(reference: Ref<T>): T`

Identity function to unwrap a reference.

```typescript
const post = await Post.findOne({ id: 1 });
const author = unwrap(post.author);  // author === post.author
```

**Use Cases:**
- Explicit unwrapping for clarity
- API consistency
- Code readability

---

### Function: `isLoaded<T>(value: Ref<T> | null | undefined): value is Ref<T>`

Type guard to check if a reference is loaded (not null/undefined).

```typescript
const post = await Post.findOne({ id: 1 });

if (isLoaded(post.author)) {
  console.log(post.author.name);  // TypeScript knows author is defined
}
```

**Use Cases:**
- Optional relationship checking
- Type narrowing
- Null safety

---

## Usage Examples

### Basic Relationship

```typescript
// entities/Author.ts
import type { Book } from './Book';

@Entity()
export class Author extends BaseEntity {
  @PrimaryKey()
  id: number;

  @Property()
  name: string;

  @OneToMany(() => Book, book => book.author)
  books: Ref<Book>[];
}

// entities/Book.ts
import type { Author } from './Author';

@Entity()
export class Book extends BaseEntity {
  @PrimaryKey()
  id: number;

  @Property()
  title: string;

  @ManyToOne()
  author: Ref<Author>;
}
```

**Usage:**
```typescript
const book = await Book.findOne({ id: 1 }, {
  load: ['author']
});

console.log(book.author.name);  // Direct access, fully typed
```

---

### Nested Relationships

```typescript
// entities/Category.ts
import type { Product } from './Product';

@Entity()
export class Category extends BaseEntity {
  @PrimaryKey()
  id: number;

  @Property()
  name: string;

  @OneToMany(() => Product, product => product.category)
  products: Ref<Product>[];
}

// entities/Product.ts
import type { Category } from './Category';
import type { OrderItem } from './OrderItem';

@Entity()
export class Product extends BaseEntity {
  @PrimaryKey()
  id: number;

  @Property()
  name: string;

  @ManyToOne()
  category: Ref<Category>;

  @OneToMany(() => OrderItem, item => item.product)
  orderItems: Ref<OrderItem>[];
}

// entities/OrderItem.ts
import type { Product } from './Product';

@Entity()
export class OrderItem extends BaseEntity {
  @PrimaryKey()
  id: number;

  @Property()
  quantity: number;

  @ManyToOne()
  product: Ref<Product>;
}
```

**Usage:**
```typescript
const orderItem = await OrderItem.findOne({ id: 1 }, {
  load: ['product', 'product.category']
});

console.log(orderItem.product.category.name);  // Deep access, fully typed
```

---

### Optional References

```typescript
@Entity()
export class Comment extends BaseEntity {
  @PrimaryKey()
  id: number;

  @Property()
  content: string;

  @ManyToOne()
  parent: Ref<Comment> | null;  // Optional self-reference
}
```

**Usage:**
```typescript
const comment = await Comment.findOne({ id: 1 });

if (isLoaded(comment.parent)) {
  console.log('Reply to:', comment.parent.content);
} else {
  console.log('Top-level comment');
}
```

---

## Migration Guide

### Before: Direct Types (Circular Dependencies)

```typescript
// ❌ Causes circular dependencies
import { User } from './User';

@Entity()
export class Post extends BaseEntity {
  @ManyToOne(() => User)
  author: User;
}
```

### After: Ref<T> (No Circular Dependencies)

```typescript
// ✅ No circular dependencies
import type { User } from './User';

@Entity()
export class Post extends BaseEntity {
  @ManyToOne(() => User)
  author: Ref<User>;
}
```

### Migration Steps

1. **Change import to type-only:**
   ```typescript
   - import { User } from './User';
   + import type { User } from './User';
   ```

2. **Wrap type with Ref:**
   ```typescript
   - author: User;
   + author: Ref<User>;
   ```

3. **No code changes needed** - usage remains identical!

---

## Best Practices

### 1. Always Use Type-Only Imports

```typescript
// ✅ Good
import type { User } from './User';

// ❌ Avoid (runtime import may cause circular dependency)
import { User } from './User';
```

### 2. Use Ref for All Relationship Properties

```typescript
@Entity()
export class Post extends BaseEntity {
  // ✅ Good
  @ManyToOne()
  author: Ref<User>;

  // ❌ Avoid (may cause circular dependency)
  @ManyToOne()
  author: User;
}
```

### 3. Use isLoaded for Optional Refs

```typescript
// ✅ Good
if (isLoaded(post.author)) {
  console.log(post.author.name);
}

// ❌ Avoid (may throw if null)
console.log(post.author?.name);  // Works but less explicit
```

### 4. Organize Entities by Domain

Group related entities to minimize circular dependencies:

```
entities/
  user/
    User.ts
    UserProfile.ts
  post/
    Post.ts
    Comment.ts
  product/
    Product.ts
    Category.ts
```

---

## Performance

### Zero Runtime Overhead

`Ref<T>` has **absolutely zero runtime cost**:

```typescript
type Ref<T> = T;  // Just a type alias

const user = new User();
const userRef: Ref<User> = user;

console.log(user === userRef);  // true (same reference)
console.log(typeof userRef);    // 'object' (no wrapper)
```

**Benchmarks:**
- ✅ No wrapper objects created
- ✅ No function calls on access
- ✅ No memory overhead
- ✅ Same performance as direct access

---

## Comparison with Other ORMs

### MikroORM's Ref

MikroORM uses a **class-based wrapper** with runtime overhead:

```typescript
// MikroORM - runtime wrapper
author: Ref<User>;  // Creates wrapper object
const name = author.unwrap().name;  // Must unwrap
```

### Cheetah.js's Ref

Cheetah.js uses a **type-only wrapper** with zero overhead:

```typescript
// Cheetah.js - type-only wrapper
author: Ref<User>;  // No wrapper at runtime
const name = author.name;  // Direct access
```

**Advantages:**
- ✅ Simpler API (no unwrap needed)
- ✅ Better performance (zero overhead)
- ✅ More intuitive (transparent access)
- ✅ Lighter memory footprint

---

## TypeScript Configuration

Ensure your `tsconfig.json` has:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strict": true,
    "importsNotUsedAsValues": "error"
  }
}
```

The `importsNotUsedAsValues: "error"` option ensures you use `import type` for type-only imports.

---

## FAQ

### Q: Why not just use `User` directly?

**A:** Direct imports create circular dependencies when entities reference each other.

### Q: Is there any performance cost?

**A:** No. `Ref<T>` is a type-only wrapper with zero runtime overhead.

### Q: Do I need to change my code when migrating?

**A:** Only type annotations. Usage remains identical - no code changes needed.

### Q: Can I use Ref with arrays?

**A:** Yes! `Ref<Post>[]` works perfectly for one-to-many relationships.

### Q: What about the old `Reference` class?

**A:** It's deprecated but kept for backward compatibility. Use `Ref<T>` instead.

---

## Troubleshooting

### Circular Dependency Error

**Error:**
```
Error: Circular dependency detected: User -> Post -> User
```

**Solution:**
```typescript
// Change runtime import to type-only import
- import { User } from './User';
+ import type { User } from './User';

// Wrap type with Ref
- author: User;
+ author: Ref<User>;
```

### Type Error on Access

**Error:**
```typescript
const name = post.author.name;  // Error: author may be undefined
```

**Solution:**
```typescript
if (isLoaded(post.author)) {
  const name = post.author.name;  // ✅ Type-safe
}
```

---

## Conclusion

`Ref<T>` is a simple, elegant solution for circular dependencies in TypeScript:

- ✅ **Zero runtime overhead** - type-only wrapper
- ✅ **Transparent access** - use like the original type
- ✅ **Full type safety** - complete IntelliSense support
- ✅ **Developer-friendly** - intuitive API
- ✅ **Performance** - same as direct access

Use it for all entity relationships to write clean, maintainable ORM code!

---

**Generated with ❤️ for Cheetah.js ORM**
