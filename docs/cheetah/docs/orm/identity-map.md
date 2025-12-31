---
sidebar_position: 6
---

# Identity Map

The **Identity Map** is a fundamental pattern used by Cheetah.js ORM to ensure data consistency and optimize performance within a single request.

## What is an Identity Map?

An Identity Map keeps track of all entities loaded from the database in a specialized registry. If you try to load the same record multiple times, the ORM returns the **exact same object instance** from memory instead of creating a new one or querying the database again.

## Benefits

1.  **Object Consistency**: If you modify a `User` object in one part of your code, any other part of the code referencing that same `User` (by ID) will see the changes immediately, because they share the same memory reference.
2.  **Performance**: Reduces redundant database queries. If an entity is already in the map, `findById` returns it instantly.
3.  **Circular Dependency Safety**: Helps in managing complex object graphs where entities might point back to each other.

## How it works in Cheetah.js

The Identity Map is managed via **AsyncLocalStorage**. This ensures that each concurrent HTTP request has its own isolated map, preventing data leakage between users.

### Automatic Registration

The `IdentityMapMiddleware` is automatically included when you use the `CheetahOrm` plugin.

```ts
// This happens automatically under the hood:
app.use(CheetahOrm); 
// ^ Registers IdentityMapMiddleware globally
```

### Example Scenario

```ts
@Service()
export class MyService {
  async run() {
    // 1. First query: Hits the database
    const user1 = await userRepository.findById(1);

    // 2. Second query: Returns user1 from memory (no DB hit)
    const user2 = await userRepository.findById(1);

    console.log(user1 === user2); // true (Same instance!)
    
    user1.name = 'Updated Name';
    console.log(user2.name); // 'Updated Name'
  }
}
```

## Internal Details

- **Scope**: The map is created at the start of the request and destroyed at the end.
- **Key**: Entities are indexed by their class name and primary key.
- **Manual Access**: While rarely needed, you can access the map via `identityMapContext.getIdentityMap()`.
