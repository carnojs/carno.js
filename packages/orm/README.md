# Cheetah.js ORM
Cheetah.js ORM is a simple and powerful ORM for Cheetah.js and Bun.
<br>We don't use any query builder like knex, we have our own query builder making us faster.
**In development.**

### Menu
- [Installation](#install)
- [Entities](#entities)
  - [Value Objects](#value-objects)
  - [Hooks](#hooks)
- [Usage](#usage)
- [Caching](#caching)
- [Identity Map](#identity-map)
- [Migrations](#migrations)

### [Installation](#install)
For install Cheetah.js ORM, run the command below:

```bash
bun install @cheetah.js/orm
```
Create a configuration file for the ORM in the root of the project called "cheetah.config.ts" and configure the database connection, providers and entities:

```javascript
import { PgDriver } from '@cheetah.js/orm';
import { ConnectionSettings } from '@cheetah.js/orm/driver/driver.interface';

const config: ConnectionSettings<any> = {
  host: 'localhost',
  port: 5432,
  database: 'postgres',
  username: 'postgres',
  password: 'postgres',
  driver: PgDriver,
  migrationPath: 'path_migrations', 
  entities: 'entity/*.ts' // or [User, Post, ...]
};

export default config;
```
Actually, the ORM only supports PostgreSQL, but in the future it will support other databases.
- Entities: Path to entities. Accepts glob patterns or an array of Entity classes.
- MigrationPath: Path to migrations. Accepts glob patterns. Is optional.
- Connection pool (optional): `max`, `idleTimeout`, `maxLifetime`, `connectionTimeout` in seconds control the Bun SQL pool. Defaults are 20 connections, 20s idle timeout, 300s max lifetime, and 10s connection timeout.
<br/>
<br/>
After that, you need to import the ORM into the project and add it to the Cheetah.js instance:
    
```javascript
import { Cheetah } from '@cheetah.js/core';
import { CheetahOrm } from '@cheetah.js/orm';

new Cheetah().use(CheetahOrm).listen();
```

### [Entities](#entities)
Entities are classes that map to database tables. Each entity must have a primary key.

#### Example:
```javascript
import { Entity, PrimaryKey, Property } from '@cheetah.js/orm';

@Entity()
export class User {
  @PrimaryKey()
  id: number;

  @Property()
  name: string;
}
```

#### PrimaryKey
The @PrimaryKey decorator is used to define the primary key of the entity.

#### Nullable property
For define a nullable property, add a parameter to the @Property decorator:

```javascript
@Entity()
export class User {
    @PrimaryKey()
    id: number;

    @Property({ nullable: true })
    name: string;
}
```
Cheetah ORM can also distinguish nullable properties automatically by adding the question mark to the end of the property name:

```javascript
export class User {
    @PrimaryKey()
    id: number;

    @Property()
    name?:string;
}
```

#### Unique property
For define a unique property, add a parameter to the @Property decorator:

```javascript
@Entity()
export class User {
    @PrimaryKey()
    id: number;

    @Property({ unique: true })
    name: string;
}
```

#### Index property
For define a index for a unique property, add a parameter to the @Property decorator:

```javascript
@Entity()
export class User {
    @PrimaryKey()
    id: number;

    @Property({ index: true })
    name: string;
}
```

For define a index for a multiple properties, add the @Index decorator. You can use it on a property or on the class. It accepts either an array of property names (legacy) or an object with a properties field (recommended):

```javascript
@Entity()
export class User {
    @PrimaryKey()
    id: number;

    @Property()
    name: string;

    // Property-level (compound index)
    @Index({ properties: ['name', 'email'] })
    @Property()
    email: string;
}

// Or, at the class level

@Entity()
@Index<{ User }>({ properties: ['name', 'email'] })
export class User {
  @PrimaryKey()
  id: number;

  @Property()
  name: string;

  @Property()
  email: string;
}

// Backward compatible usage (array):
// @Index(['name', 'email'])
```

Partial indexes (Postgres only) can be declared with `where`. You can provide a raw SQL string or a typed callback that receives the column map (with autocomplete based on your entity):

```javascript
@Entity()
@Index<{ User }>({
  properties: ['email'],
  where: (columns) => `${columns.isActive} = true`,
})
export class User {
  @PrimaryKey()
  id: number;

  @Property()
  email: string;

  @Property()
  isActive: boolean;
}
```

You can also use the ORM filter syntax in `where` (with `$in`, `$or`, `$nor`, etc.):

```javascript
@Entity()
@Index<{ User }>({
  properties: ['email'],
  where: {
    isActive: true,
    status: { $in: ['active', 'pending'] },
  },
})
export class User {
  @PrimaryKey()
  id: number;

  @Property()
  email: string;

  @Property()
  isActive: boolean;

  @Property()
  status: string;
}
```

Note: MySQL does not support partial indexes; using `where` with the MySQL driver will throw.

#### Property options
| Option | Type | Description                                                                                |
| ------ | ---- |--------------------------------------------------------------------------------------------|
| nullable | boolean | Defines if the property is nullable.                                                       |
| unique | boolean | Defines if the property is unique.                                                         |
| index | boolean | Defines if the property is index.                                                          |
| default | any | Defines the default value of the property.                                                 |
| length | number | Defines the length of the property.                                                        |
| onUpdate | string | Define the action to be taken for this property when updating the entity in the database   |
| onInsert | string | Defines the action to be taken for this property when inserting the entity in the database |

#### Computed Properties
The `@Computed` decorator allows you to define properties that are included in serialization but NOT persisted to the database. This is useful for derived values, formatted data, or any computation based on existing properties.

Computed properties are evaluated when the entity is serialized (e.g., `JSON.stringify()`) and are perfect for transforming or combining existing data.

##### Example:
```javascript
import { Entity, PrimaryKey, Property, Computed } from '@cheetah.js/orm';

@Entity()
export class Article {
  @PrimaryKey()
  id: number;

  @Property()
  title: string;

  @Property()
  body: string;

  @Computed()
  get excerpt() {
    return this.body?.substring(0, 50) || '';
  }

  @Computed()
  get titleUppercase() {
    return this.title?.toUpperCase() || '';
  }
}
```

When you serialize an article:
```javascript
const article = await Article.create({
  title: 'My Article',
  body: 'This is the full body text of the article...'
});

console.log(JSON.stringify(article));
// Output: {"id":1,"title":"My Article","body":"This is the full body text of the article...","excerpt":"This is the full body text of the article...","titleUppercase":"MY ARTICLE"}
```

**Important Notes:**
- Computed properties are **NOT** stored in the database
- They are evaluated during serialization (toJSON)
- Best used with getter functions
- Can access other properties and even other computed properties
- Can return any JSON-serializable type (string, number, object, array, etc.)

### [Hooks](#hooks)
Cheetah ORM supports hooks for entities. The available hooks are: BeforeCreate, AfterCreate, BeforeUpdate, AfterUpdate, BeforeDelete, AfterDelete.
Hooks is only for modify the entity, not for create, update or delete another entities statements in database.

### Example:
```javascript
import { Entity, PrimaryKey, Property, BeforeCreate } from '@cheetah.js/orm';

@Entity()
export class User {
    @PrimaryKey()
    id: number;

    @Property()
    name: string;

    @BeforeCreate()
    static beforeCreate() {
        this.name = 'John Doe';
    }
}
```

#### Value Objects
A Value Object is an immutable type that is distinguishable only by the state of its properties. That is, unlike an Entity, which has a unique identifier and remains distinct even if its properties are otherwise identical, two Value Objects with the exact same properties can be considered equal.
Cheetah ORM Entities support Value Objects. To define a Value Object, extends the ValueObject class:

```javascript
import { ValueObject } from '@cheetah.js/orm';

export class Name extends ValueObject<string, Name> { // First type is a value scalar type, 
    // and second is a ValueObject

 validate(value): boolean {
   return value.length > 0; // Any validation
 }
}

const name = new Name('John Doe');
const name2 = Name.from('John Doe'); // Same as above

console.log(name.equals(name2)); // true

```

### Caching
You can cache SELECT queries by providing the `cache` option in find methods or QueryBuilder:

- `cache: true` keeps the result cached using the driver default policy
- `cache: number` sets a TTL in milliseconds
- `cache: Date` sets an absolute expiration date

Examples:

```ts
// Cache with TTL (5 seconds)
await repo.find({ where: { name: 'John' }, cache: 5000 });

// Cache until a specific date
await repo.find({ where: { name: 'John' }, cache: new Date(Date.now() + 60_000) });

// Infinite/driver-default cache
await repo.find({ where: { name: 'John' }, cache: true });
```

### Identity Map

The Identity Map is an in-memory cache that ensures each entity is loaded only once per request context. This pattern reduces database queries and guarantees that all references to the same entity point to the same object instance.

#### Key Benefits

- **Reduced Database Queries**: When querying for an entity that was already loaded in the same context, the cached instance is returned instead of executing another query
- **Consistent Entity References**: All parts of your code working with the same entity will share the same instance
- **Memory Efficient**: Uses WeakRef internally, allowing garbage collection of unreferenced entities
- **Per-Request Isolation**: Each request has its own identity map, preventing data leakage between requests

#### Automatic Activation (Recommended)

**The identity map is automatically enabled for all routes when you use `CheetahOrm`!** No additional configuration needed:

```typescript
import { Cheetah } from '@cheetah.js/core';
import { CheetahOrm } from '@cheetah.js/orm';

new Cheetah()
  .use(CheetahOrm)  // ← Identity map automatically active for all routes
  .listen();
```

Now all your controllers automatically benefit from the identity map:

```typescript
import { Controller, Get } from '@cheetah.js/core';

@Controller('/users')
export class UserController {
  @Get('/:id/posts')
  async getUserPosts(id: number) {
    // Identity map is AUTOMATICALLY active - no decorator needed!
    const user = await User.findOne({ id });
    const posts = await Post.findAll({ userId: id }, { load: ['user'] });
    
    // posts[0].user === user (same instance, no extra query)
    return { user, posts };
  }
}
```

**That's it!** The identity map works transparently across your entire application.

#### Manual Usage (Advanced)

For custom scenarios, use `identityMapContext.run()` directly:

```typescript
import { identityMapContext } from '@cheetah.js/orm';

async function processUserData(userId: number) {
  await identityMapContext.run(async () => {
    // All queries within this context share the same identity map
    const user = await User.findOne({ id: userId });
    const posts = await Post.findAll({ userId }, { load: ['user'] });
    
    // posts[0].user === user (same instance, no extra query)
    return { user, posts };
  });
}
```

#### How It Works

```typescript
await identityMapContext.run(async () => {
  // First query - fetches from database and caches
  const user1 = await User.findOne({ id: 1 });
  
  // Second query - returns cached instance (no database query)
  const user2 = await User.findOne({ id: 1 });
  
  console.log(user1 === user2); // true - same object instance
  
  // Modifications are reflected everywhere
  user1.name = 'Updated Name';
  console.log(user2.name); // 'Updated Name'
});
```

#### Relationship Loading

The identity map automatically caches entities loaded through relationships:

```typescript
await identityMapContext.run(async () => {
  // Load user first
  const user = await User.findOne({ id: 1 });
  
  // Load posts with user relationship
  const posts = await Post.findAll(
    { userId: 1 },
    { load: ['user'] }
  );
  
  // The user loaded through posts is the same cached instance
  console.log(posts[0].user === user); // true
});
```

#### Context Isolation

Each `identityMapContext.run()` creates an isolated scope:

```typescript
let user1, user2;

// First context
await identityMapContext.run(async () => {
  user1 = await User.findOne({ id: 1 });
});

// Second context - completely separate identity map
await identityMapContext.run(async () => {
  user2 = await User.findOne({ id: 1 });
});

// Different contexts = different instances
console.log(user1 === user2); // false
```

#### Without Identity Map Context

When not using `identityMapContext.run()`, the ORM behaves normally without caching:

```typescript
// Without context wrapper
const user1 = await User.findOne({ id: 1 });
const user2 = await User.findOne({ id: 1 });

console.log(user1 === user2); // false - different instances
```

#### Advanced: Disabling or Customizing

If you need to disable the identity map for specific routes, you can use manual context management:

```typescript
import { Controller, Get, Middleware } from '@cheetah.js/core';
import { identityMapContext, IdentityMapMiddleware } from '@cheetah.js/orm';

@Controller('/users')
export class UserController {
  @Get('/:id')
  async getUser(id: number) {
    // Identity map active (global middleware)
    return User.findOne({ id });
  }

  @Get('/legacy')
  async getLegacyUsers() {
    // To bypass identity map, just query normally
    // The global middleware is still active, but you can
    // control when to use it via manual context management
    return User.findAll({});
  }
}
```

For other frameworks (Express, Fastify, etc.), use the manual approach:

```typescript
// Express example
import { identityMapContext } from '@cheetah.js/orm';

app.use(async (req, res, next) => {
  await identityMapContext.run(async () => {
    await next();
  });
});
```

#### Performance Considerations

- The identity map uses O(1) lookup time via Map-based storage
- WeakRef ensures entities can be garbage collected when no longer referenced
- FinalizationRegistry automatically cleans up expired cache entries
- Per-request scope prevents memory buildup across requests
- No configuration needed - works transparently with existing queries

Is Required to implement the validate method, that returns a boolean value.
To use the Value Object in the Entity, just add the ValueObject type to the property:

```javascript
import { Entity, PrimaryKey, Property } from '@cheetah.js/orm';

@Entity()
export class User {
    @PrimaryKey()
    id: number;

    @Property()
    name: Name;
}
```
Cheetah ORM will automatically convert the Value Object to the database type and vice versa.<br>
Important: If you value object is different from string type, you need to define the database type in the @Property decorator, because the Cheetah ORM would not know the correct type of your value object:

```javascript
import { Entity, PrimaryKey, Property } from '@cheetah.js/orm';

@Entity()
export class User {
    @PrimaryKey()
    id: number;

    @Property({ type: 'json' })
    name: Name;
}
```

#### Relations
Cheetah ORM supports relations between entities. The available relations are: OneToMany, ManyToOne.

##### OneToMany
The OneToMany relation is used to define a one-to-many relationship between two entities. For example, a user can have multiple posts, but a post can only have one user.

```javascript
@Entity()
export class User {
    @PrimaryKey()
    id: number;

    @Property()
    name: string;

    @OneToMany(() => Post, (post) => post.user)
    posts: Post[];
}
```

#### ManyToOne
The owner side of the relation is the side that has the @ManyToOne decorator. The inverse side is the side that has the @OneToMany decorator. The owner side is always the side that has the foreign key.

```javascript
@Entity()
export class Post {
    @PrimaryKey()
    id: number;

    @Property()
    title: string;

    @ManyToOne(() => User)
    user: User;
}
```

### [Usage](#usage)
#### Create a new entity
```javascript
import { User } from './entity/user';

const user = User.create({ name: 'John Doe' });

// OR
const user = new User();
user.name = 'John Doe';
await user.save();
```

#### Find a entity
```javascript
import { User } from './entity/user';

const user = await User.findOne({ 
    name: 'John Doe',
    old: { $gte: 16, $lte: 30 }
});
```

#### Transactions
```typescript
import { Orm } from '@cheetah.js/orm';

const orm = Orm.getInstance();

await orm.transaction(async (tx) => {
  await tx`INSERT INTO users (name) VALUES (${ 'Jane Doe' })`;
  await tx`UPDATE accounts SET balance = balance - 100 WHERE user_id = ${ 1 }`;
});
```
The `transaction` method leverages the active driver implementation, ensuring consistent transactional semantics across supported databases.

#### List of supported operators
| Operator |Name | Description |
| ------ | ---- |--------------------------------------------------------------------------------------------|
| $eq | Equal | Matches values that are equal to a specified value. |
| $gt | Greater Than | Matches values that are greater than a specified value. |
| $gte | Greater Than or Equal | Matches values that are greater than or equal to a specified value. |
| $in | In | Matches any of the values specified in an array. |
| $lt | Less Than | Matches values that are less than a specified value. |
| $lte | Less Than or Equal | Matches values that are less than or equal to a specified value. |
| $ne | Not Equal | Matches all values that are not equal to a specified value. |
| $nin | Not In | Matches none of the values specified in an array. |
| $and | And | Joins query clauses with a logical AND returns all documents that match the conditions of both clauses. |
 | $or | Or | Joins query clauses with a logical OR returns all documents that match the conditions of either clause. |
| $not | Not | Inverts the effect of a query expression and returns documents that do not match the query expression. |

#### Filter by Date columns
You can filter using JavaScript `Date` instances and the ORM translates them into precise SQL comparisons:

```typescript
const reinforcement = await User.findOne({
  updatedAt: new Date('2024-06-01T00:00:00.000Z'),
});
```

### [Migrations](#migrations)
Cheetah ORM is capable of creating and running migrations.
To do this, you need to install our cli package:

```bash
bun install @cheetah.js/cli
```

You must have the connection configuration file in the project root "cheetah.config.ts".
To create a migration, run the command below:

```bash
bunx cli migration:generate
```
This command will create a migration file in the path defined in the configuration file, differentiating your entities created with the database.

#### Example:
```bash
bunx cli cheetah-orm migration:run
```
This command will run all migrations that have not yet been run.
