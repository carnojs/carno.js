---
sidebar_position: 7
---

# Querying & Operators

Carno ORM provides a consistent way to filter data across Repositories, Active Records, and the Query Builder using a unified `where` clause structure.

## Basic Equality

The simplest query is an object where keys match column names and values match the desired equality.

```typescript
// WHERE "role" = 'admin' AND "isActive" = true
{
  role: 'admin',
  isActive: true
}
```

## Comparison Operators

For more complex conditions, you can use comparison operators.

| Operator | Description | SQL Equivalent |
| :--- | :--- | :--- |
| `$eq` | Equal to (optional, default behavior) | `=` |
| `$ne` | Not equal to | `!=` or `<>` |
| `$gt` | Greater than | `>` |
| `$gte` | Greater than or equal to | `>=` |
| `$lt` | Less than | `<` |
| `$lte` | Less than or equal to | `<=` |
| `$like` | Pattern matching | `LIKE` |
| `$in` | In array | `IN (...)` |
| `$nin` | Not in array | `NOT IN (...)` |

### Examples

```typescript
// Age > 18
{ age: { $gt: 18 } }

// Price between 10 and 100 (using implicit AND)
{ 
  price: { 
    $gte: 10,
    $lte: 100 
  } 
}

// Name starts with "Joh"
{ name: { $like: 'Joh%' } }

// Status is 'pending' or 'processing'
{ status: { $in: ['pending', 'processing'] } }

// Not deleted
{ deletedAt: { $ne: null } }
```

## Logical Operators

You can combine conditions using `$and` and `$or`.

### $and

Combines multiple conditions. Note that top-level properties in an object are already treated as an implicit AND. Explicit `$and` is useful for complex nested logic.

```typescript
{
  $and: [
    { role: 'admin' },
    { age: { $gt: 30 } }
  ]
}
```

### $or

Matches if at least one of the conditions is true.

```typescript
// (role = 'admin') OR (role = 'moderator')
{
  $or: [
    { role: 'admin' },
    { role: 'moderator' }
  ]
}
```

### Combining $and and $or

```typescript
// (isActive = true) AND ((role = 'admin') OR (credits > 1000))
{
  isActive: true,
  $or: [
    { role: 'admin' },
    { credits: { $gt: 1000 } }
  ]
}
```

## Usage

These query structures can be used in all finding methods.

### Repository

```typescript
await userRepository.find({
  where: { age: { $gte: 21 } }
});
```

### Active Record

```typescript
await User.findOne({
  email: { $like: '%@gmail.com' }
});
```

### Query Builder

```typescript
await User.createQueryBuilder()
  .where({
    $or: [
      { status: 'active' },
      { lastLogin: { $gt: new Date('2024-01-01') } }
    ]
  })
  .executeAndReturnAll();
```
