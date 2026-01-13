import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { app, execute, purgeDatabase, startDatabase } from '../node-database';
import { BaseEntity, Entity, PrimaryKey, Property, ManyToOne } from '../../src';
import { v4 } from 'uuid';

// Define all entities at module level for proper decorator registration

@Entity()
class Product extends BaseEntity {
  @PrimaryKey({ columnName: 'product_uuid' })
  productUuid: string = v4();

  @Property()
  name: string;

  @Property()
  price: number;
}

@Entity()
class Order extends BaseEntity {
  @PrimaryKey({ columnName: 'order_id' })
  orderId: string;

  @Property()
  status: string;

  @Property()
  total: number;
}

@Entity({ tableName: 'app_user' })
class AppUser extends BaseEntity {
  @PrimaryKey({ columnName: 'user_code' })
  userCode: string;

  @Property()
  username: string;
}

@Entity()
class Post extends BaseEntity {
  @PrimaryKey({ columnName: 'post_id' })
  postId: number;

  @Property()
  title: string;

  @ManyToOne(() => AppUser)
  userCode: AppUser;
}

@Entity()
class Inventory extends BaseEntity {
  @PrimaryKey()
  sku: string;

  @Property()
  quantity: number;

  @Property()
  warehouse: string;
}

@Entity()
class Category extends BaseEntity {
  @PrimaryKey({ columnName: 'category_code' })
  categoryCode: string;

  @Property()
  name: string;
}

@Entity()
class Session extends BaseEntity {
  @PrimaryKey({ columnName: 'session_token' })
  sessionToken: string;

  @Property()
  userId: number;

  @Property()
  expiresAt: Date;
}

/**
 * E2E Integration tests for custom primary keys with caching
 * Verifies that the entire ORM stack correctly uses cached primary key metadata
 */
describe('Custom Primary Key Integration (E2E)', () => {
  beforeEach(async () => {
    await startDatabase();
  });

  afterEach(async () => {
    await purgeDatabase();
    await app?.disconnect();
  });

  test('should insert and retrieve entity with custom UUID primary key', async () => {
    const DDL = `
      CREATE TABLE "product" (
        "product_uuid" uuid PRIMARY KEY,
        "name" varchar(255) NOT NULL,
        "price" integer
      );
    `;

    await execute(DDL);

    // Create product
    const uuid = v4();
    const product = await Product.create({
      productUuid: uuid,
      name: 'Test Product',
      price: 100,
    });

    expect(product).toBeInstanceOf(Product);
    expect(product.productUuid).toBe(uuid);

    // Retrieve product using custom PK
    const found = await Product.findOne({ productUuid: uuid });

    expect(found).toBeInstanceOf(Product);
    expect(found!.productUuid).toBe(uuid);
    expect(found!.name).toBe('Test Product');
    expect(found!.price).toBe(100);
  });

  test('should update entity with custom primary key', async () => {
    const DDL = `
      CREATE TABLE "order" (
        "order_id" varchar(50) PRIMARY KEY,
        "status" varchar(50) NOT NULL,
        "total" integer
      );
    `;

    await execute(DDL);

    const order = await Order.create({
      orderId: 'ORD-001',
      status: 'pending',
      total: 150,
    });

    // Update
    order.status = 'completed';
    await order.save();

    const updated = await Order.findOne({ orderId: 'ORD-001' });

    expect(updated!.status).toBe('completed');
  });

  test('should handle one-to-many relationship with custom primary keys', async () => {
    const DDL_USER = `
      CREATE TABLE "app_user" (
        "user_code" varchar(20) PRIMARY KEY,
        "username" varchar(100) NOT NULL
      );
    `;

    const DDL_POST = `
      CREATE TABLE "post" (
        "post_id" SERIAL PRIMARY KEY,
        "title" varchar(255) NOT NULL,
        "user_code_id" varchar(20) REFERENCES "app_user"("user_code")
      );
    `;

    await execute(DDL_USER);
    await execute(DDL_POST);

    const user = await AppUser.create({
      userCode: 'USR-123',
      username: 'testuser',
    });

    await Post.create({
      postId: 1,
      title: 'Test Post',
      userCode: user,
    });

    const foundPost = await Post.findOne({ postId: 1 }, { load: ['userCode'] });

    expect(foundPost).toBeInstanceOf(Post);
    expect(foundPost!.userCode).toBeInstanceOf(AppUser);
    expect(foundPost!.userCode.userCode).toBe('USR-123');
  });

  test('should correctly find entities with composite where clause on custom PK', async () => {
    const DDL = `
      CREATE TABLE "inventory" (
        "sku" varchar(50) PRIMARY KEY,
        "quantity" integer NOT NULL,
        "warehouse" varchar(50)
      );
    `;

    await execute(DDL);

    await Inventory.create({ sku: 'SKU-001', quantity: 100, warehouse: 'WH-A' });
    await Inventory.create({ sku: 'SKU-002', quantity: 50, warehouse: 'WH-B' });

    const result = await Inventory.findOne({
      sku: 'SKU-001',
      warehouse: 'WH-A',
    });

    expect(result).toBeInstanceOf(Inventory);
    expect(result!.sku).toBe('SKU-001');
    expect(result!.quantity).toBe(100);
  });

  test('should correctly handle findAll with custom primary key', async () => {
    const DDL = `
      CREATE TABLE "category" (
        "category_code" varchar(10) PRIMARY KEY,
        "name" varchar(100) NOT NULL
      );
    `;

    await execute(DDL);

    await Category.create({ categoryCode: 'CAT-A', name: 'Category A' });
    await Category.create({ categoryCode: 'CAT-B', name: 'Category B' });
    await Category.create({ categoryCode: 'CAT-C', name: 'Category C' });

    const all = await Category.findAll({});

    expect(all).toHaveLength(3);
    expect(all.every(c => c instanceof Category)).toBe(true);
    expect(all.map(c => c.categoryCode).sort()).toEqual(['CAT-A', 'CAT-B', 'CAT-C']);
  });

  test('should delete entity with custom primary key', async () => {
    const DDL = `
      CREATE TABLE "session" (
        "session_token" varchar(100) PRIMARY KEY,
        "user_id" integer,
        "expires_at" timestamp
      );
    `;

    await execute(DDL);

    const session = await Session.create({
      sessionToken: 'TOKEN-123',
      userId: 1,
      expiresAt: new Date(),
    });

    await session.remove();

    const found = await Session.findOne({ sessionToken: 'TOKEN-123' });
    expect(found).toBeUndefined();
  });
});
