# Auto-Detection of Entity Types for ManyToOne

## Overview

Starting from version 0.1.56, Cheetah ORM supports automatic detection of entity types in `@ManyToOne()` decorator, reducing boilerplate and cognitive load.

## Features

### Optional Entity Parameter for ManyToOne

The `@ManyToOne()` decorator now supports an optional entity parameter.

#### Before (Explicit Entity)
```typescript
import { Entity, PrimaryKey, Property, ManyToOne, OneToMany } from '@cheetah.js/orm';

@Entity()
class User extends BaseEntity {
  @PrimaryKey()
  id: number;

  @Property()
  name: string;

  @OneToMany(() => Post, (post) => post.userId)  // Entity required
  posts: Post[];
}

@Entity()
class Post extends BaseEntity {
  @PrimaryKey()
  id: number;

  @Property()
  userId: number;

  @Property()
  title: string;

  @ManyToOne(() => User)  // Entity required
  user: User;
}
```

#### After (Auto-Detection for ManyToOne)
```typescript
import { Entity, PrimaryKey, Property, ManyToOne, OneToMany } from '@cheetah.js/orm';

@Entity()
class User extends BaseEntity {
  @PrimaryKey()
  id: number;

  @Property()
  name: string;

  @OneToMany(() => Post, (post) => post.userId)  // Entity still required
  posts: Post[];
}

@Entity()
class Post extends BaseEntity {
  @PrimaryKey()
  id: number;

  @Property()
  userId: number;

  @Property()
  title: string;

  @ManyToOne()  // ✨ Entity auto-detected!
  user: User;
}
```

## How It Works

### ts-morph Analysis

When your application initializes, the ORM uses **ts-morph** to analyze your source files and automatically detect entity types based on:

1. **Property type annotations** - The TypeScript type of the property
2. **Property naming conventions** - Singular names for `@ManyToOne`, plural for `@OneToMany`
3. **Entity registry** - Registered entities in the metadata system

### Detection Strategy

**For @ManyToOne:**
```typescript
@ManyToOne()
user: User;  // Type 'User' is detected from property annotation
```

**For @OneToMany:**
```typescript
@OneToMany(() => Post, (post) => post.userId)  // Entity parameter required
posts: Post[];
```

### Fallback Mechanism

If ts-morph cannot analyze the source files (e.g., in test environments with inline entities), the system falls back to:

1. Property name analysis (e.g., `posts` → `Post`, `user` → `User`)
2. Case-insensitive matching against registered entities
3. Warning message if detection fails

## Requirements

### File-based Entities

Auto-detection works best when entities are defined in separate files:

```
src/
  entities/
    User.ts      ✅ Can be auto-detected
    Post.ts      ✅ Can be auto-detected
    Comment.ts   ✅ Can be auto-detected
```

### TypeScript Configuration

Ensure your `tsconfig.json` has:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## Backward Compatibility

The explicit entity syntax continues to work perfectly:

```typescript
// Old syntax - still fully supported
@ManyToOne(() => User)
user: User;

@OneToMany(() => Post, (post) => post.userId)
posts: Post[];
```

You can mix both approaches in the same codebase.

## Benefits

### 1. Reduced Boilerplate for ManyToOne
- Less code to write for `@ManyToOne` relationships
- No need to specify `() => Entity` when TypeScript type is clear

### 2. Lower Cognitive Load
- For `@ManyToOne`, the entity type is inferred from the property type
- `@OneToMany` still requires explicit entity for clarity

### 3. Better DX (Developer Experience)
- Faster development for common many-to-one relationships
- Cleaner code where it makes sense

## Limitations

### Inline Entity Definitions

Auto-detection may not work for entities defined inline in test files:

```typescript
describe('My Test', () => {
  // Inline definition - may require explicit entity
  @Entity()
  class TestEntity extends BaseEntity {
    @ManyToOne(() => OtherEntity)  // Explicit required here
    other: OtherEntity;
  }
});
```

**Solution:** Use explicit entity syntax in tests, or define entities in separate files.

### Complex Type Scenarios

For complex types or conditional types, explicit entity may be needed:

```typescript
// Complex scenario - use explicit syntax
@ManyToOne(() => getEntityType())
dynamicEntity: ComplexType;
```

## Best Practices

1. **Use auto-detection for ManyToOne** - Omit entity parameter when the property type is clear
2. **Keep explicit syntax for OneToMany** - Always specify entity and fkKey for one-to-many relationships
3. **Keep explicit syntax for complex scenarios** - Circular dependencies, conditional types
4. **Organize entities in separate files** - Enables full ts-morph analysis
5. **Follow naming conventions** - Use singular property names for ManyToOne (e.g., `user`, `author`, `category`)

## Troubleshooting

### Warning: "Could not auto-detect entity"

If you see this warning:
```
Warning: Could not auto-detect entity for "Post.user". Please define it explicitly.
```

**Solutions:**
1. Use explicit entity syntax: `@ManyToOne(() => User)`
2. Ensure entity is registered before initialization
3. Check that property type matches entity name

### Relationship Not Loading

If relationships don't load:
1. Verify entity is decorated with `@Entity()`
2. Check that `onInit()` completed successfully
3. Use explicit entity syntax as fallback

## Migration Guide

### Updating Existing Code

You can gradually migrate existing code:

**Step 1:** Start with new relationships
```typescript
// New code - use auto-detection
@ManyToOne()
author: Author;
```

**Step 2:** Update existing relationships as you modify them
```typescript
// When updating this code, remove explicit entity
- @ManyToOne(() => User)
+ @ManyToOne()
  user: User;
```

**Step 3:** Keep explicit syntax where needed
```typescript
// Complex cases - keep as is
@ManyToOne(() => getDynamicEntity())
complexRelation: BaseEntity;
```

## Performance

Auto-detection happens **only during application initialization** using ts-morph:
- **Zero runtime overhead** - Detection runs once at startup
- **Same runtime performance** - No difference vs explicit syntax
- **Fast initialization** - Analysis is cached

## Examples

### Simple Blog System

```typescript
// entities/Author.ts
@Entity()
export class Author extends BaseEntity {
  @PrimaryKey()
  id: number;

  @Property()
  name: string;

  @OneToMany(() => Post, (post) => post.authorId)
  posts: Post[];
}

// entities/Post.ts
@Entity()
export class Post extends BaseEntity {
  @PrimaryKey()
  id: number;

  @Property()
  authorId: number;

  @Property()
  title: string;

  @ManyToOne()  // ✨ Entity auto-detected from type!
  author: Author;

  @OneToMany(() => Comment, (comment) => comment.postId)
  comments: Comment[];
}

// entities/Comment.ts
@Entity()
export class Comment extends BaseEntity {
  @PrimaryKey()
  id: number;

  @Property()
  postId: number;

  @Property()
  content: string;

  @ManyToOne()  // ✨ Entity auto-detected from type!
  post: Post;
}
```

### E-commerce System

```typescript
// entities/Customer.ts
@Entity()
export class Customer extends BaseEntity {
  @PrimaryKey()
  id: number;

  @Property()
  email: string;

  @OneToMany(() => Order, (order) => order.customerId)
  orders: Order[];
}

// entities/Order.ts
@Entity()
export class Order extends BaseEntity {
  @PrimaryKey()
  id: number;

  @Property()
  customerId: number;

  @Property()
  total: number;

  @ManyToOne()  // ✨ Auto-detected!
  customer: Customer;

  @OneToMany(() => OrderItem, (item) => item.orderId)
  items: OrderItem[];
}

// entities/OrderItem.ts
@Entity()
export class OrderItem extends BaseEntity {
  @PrimaryKey()
  id: number;

  @Property()
  orderId: number;

  @Property()
  productId: number;

  @Property()
  quantity: number;

  @ManyToOne()  // ✨ Auto-detected!
  order: Order;

  @ManyToOne()  // ✨ Auto-detected!
  product: Product;
}

// entities/Product.ts
@Entity()
export class Product extends BaseEntity {
  @PrimaryKey()
  id: number;

  @Property()
  name: string;

  @Property()
  price: number;

  @OneToMany(() => OrderItem, (item) => item.productId)
  orderItems: OrderItem[];
}
```

## Conclusion

Auto-detection of relationship types is a powerful feature that:
- ✅ Reduces boilerplate code
- ✅ Maintains full backward compatibility
- ✅ Improves developer experience
- ✅ Has zero runtime performance impact

Use it for cleaner, more maintainable ORM code while keeping the flexibility to use explicit syntax when needed.
