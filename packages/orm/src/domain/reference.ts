/**
 * Transparent wrapper type to prevent circular dependencies in TypeScript.
 *
 * @example
 * ```typescript
 * // Instead of direct import causing circular dependency:
 * import { User } from './User';
 * class Post {
 *   @ManyToOne()
 *   author: User; // Circular dependency!
 * }
 *
 * // Use Ref to break the cycle:
 * import type { User } from './User';
 * class Post {
 *   @ManyToOne()
 *   author: Ref<User>; // No circular dependency!
 * }
 * ```
 */
export type Ref<T> = T;

/**
 * Creates a reference to an entity.
 * This is an identity function - it returns the input unchanged.
 * Useful for explicit ref creation when needed.
 *
 * @param entity - The entity to wrap in a reference
 * @returns The same entity (identity function)
 *
 * @example
 * ```typescript
 * const user = new User();
 * const userRef = ref(user); // userRef === user (same reference)
 * ```
 */
export function ref<T>(entity: T): Ref<T> {
  return entity;
}

/**
 * Unwraps a reference to get the underlying entity.
 * This is an identity function - it returns the input unchanged.
 * Provided for API consistency and explicitness.
 *
 * @param reference - The reference to unwrap
 * @returns The underlying entity (same as input)
 *
 * @example
 * ```typescript
 * const post = await Post.findOne({ id: 1 });
 * const author = unwrap(post.author); // author === post.author
 * ```
 */
export function unwrap<T>(reference: Ref<T>): T {
  return reference;
}

/**
 * Type guard to check if a value is not null or undefined.
 * Useful when working with optional references.
 *
 * @param value - The value to check
 * @returns True if value is not null/undefined
 *
 * @example
 * ```typescript
 * const post = await Post.findOne({ id: 1 });
 * if (isLoaded(post.author)) {
 *   console.log(post.author.name); // TypeScript knows author is defined
 * }
 * ```
 */
export function isLoaded<T>(value: Ref<T> | null | undefined): value is Ref<T> {
  return value != null;
}

/**
 * @deprecated Use `Ref<T>` type instead. This class is kept for backward compatibility.
 */
export class Reference<T> {
  constructor(private entity: T) {}

  get(): T {
    return this.entity;
  }
}

/**
 * Creates a lightweight entity reference by class and id without hitting the DB.
 * Useful to assign many-to-one relations when only the id is known.
 *
 * Example:
 *   const library = await UserLibrary.create({
 *     user: refById(User, userId),
 *     course: refById(Course, courseId),
 *   });
 */
export function refById<C extends new () => any, T = InstanceType<C>, PK = any>(
  Cls: C,
  id: PK,
): T {
  const entity = new Cls() as any;

  entity.id = id;

  return entity as T;
}
