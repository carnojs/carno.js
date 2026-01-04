import { describe, expect, test } from 'bun:test';
import { withDatabase } from '../../src/testing';
import { BaseEntity } from '../../src/domain/base-entity';
import { Entity } from '../../src/decorators/entity.decorator';
import { Property } from '../../src/decorators/property.decorator';
import { PrimaryKey } from '../../src/decorators/primary-key.decorator';

const DDL_PRODUCT = `
  CREATE TABLE "product" (
    "id" SERIAL PRIMARY KEY,
    "name" varchar(255) NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "stock" integer NOT NULL
  );
`;

const DDL_ORDER = `
  CREATE TABLE "order" (
    "id" SERIAL PRIMARY KEY,
    "product_id" integer NOT NULL REFERENCES "product"("id"),
    "quantity" integer NOT NULL,
    "total" numeric(10,2) NOT NULL
  );
`;

@Entity()
class Product extends BaseEntity {
  @PrimaryKey()
  id: number;

  @Property()
  name: string;

  @Property()
  price: number;

  @Property()
  stock: number;
}

@Entity()
class Order extends BaseEntity {
  @PrimaryKey()
  id: number;

  @Property()
  productId: number;

  @Property()
  quantity: number;

  @Property()
  total: number;
}

describe('Transaction System - Integration Tests', () => {
  test('Given - Product e Order / When - Ambos salvos em transação / Then - Devem usar mesmo contexto transacional', async () => {
    await withDatabase(
      [DDL_PRODUCT, DDL_ORDER],
      async (context) => {
        // Given
        const product = new Product();
        product.id = 1;
        product.name = 'Laptop';
        product.price = 1000;
        product.stock = 10;

        const order = new Order();
        order.id = 1;
        order.productId = 1;
        order.quantity = 2;
        order.total = 2000;

        // When
        await context.orm.transaction(async (tx) => {
          await product.save();
          await order.save();
        });

        // Then
        const savedProduct = await context.executeSql('SELECT * FROM "product" WHERE id = 1');
        const savedOrder = await context.executeSql('SELECT * FROM "order" WHERE id = 1');

        expect(savedProduct.rows).toHaveLength(1);
        expect(savedOrder.rows).toHaveLength(1);
        expect(savedProduct.rows[0].name).toBe('Laptop');
        expect(savedOrder.rows[0].quantity).toBe(2);
      },
      {
        entityFile: 'packages/orm/test/transaction/transaction-integration.spec.ts',
        connection: { port: 5433 },
      }
    );
  });

  test('Given - Transação com erro / When - Primeira operação sucede e segunda falha / Then - Deve fazer rollback de ambas', async () => {
    await withDatabase(
      [DDL_PRODUCT],
      async (context) => {
        // Given
        const product = new Product();
        product.id = 1;
        product.name = 'Laptop';
        product.price = 1000;
        product.stock = 10;

        // When / Then
        try {
          await context.orm.transaction(async (tx) => {
            await product.save(); // Sucesso
            throw new Error('Simulated error'); // Forced error
          });

          // Should not reach here
          expect(true).toBe(false);
        } catch (error: any) {
          expect(error.message).toBe('Simulated error');
        }

        // Then - Verify the product was NOT saved (rollback)
        const result = await context.executeSql('SELECT * FROM "product" WHERE id = 1');
        expect(result.rows).toHaveLength(0);
      },
      {
        entityFile: 'packages/orm/test/transaction/transaction-integration.spec.ts',
        connection: { port: 5433 },
      }
    );
  });

  test('Given - Entity.save e static create na mesma transação / When - Executar ambos / Then - Devem compartilhar contexto', async () => {
    await withDatabase(
      [DDL_PRODUCT],
      async (context) => {
        // Given
        const product1 = new Product();
        product1.id = 1;
        product1.name = 'Laptop';
        product1.price = 1000;
        product1.stock = 10;

        // When
        await context.orm.transaction(async (tx) => {
          await product1.save(); // Usando instance method

          await Product.create({
            id: 2,
            name: 'Mouse',
            price: 50,
            stock: 100,
          }); // Usando static method
        });

        // Then
        const products = await context.executeSql('SELECT * FROM "product" ORDER BY id');
        expect(products.rows).toHaveLength(2);
        expect(products.rows[0].name).toBe('Laptop');
        expect(products.rows[1].name).toBe('Mouse');
      },
      {
        entityFile: 'packages/orm/test/transaction/transaction-integration.spec.ts',
        connection: { port: 5433 },
      }
    );
  });

  test('Given - Update dentro de transação / When - Atualizar entidade existente / Then - Deve usar contexto transacional', async () => {
    await withDatabase(
      [DDL_PRODUCT],
      async (context) => {
        // Given - Create a product outside the transaction
        await Product.create({
          id: 1,
          name: 'Laptop',
          price: 1000,
          stock: 10,
        });

        // When - Update inside a transaction
        await context.orm.transaction(async (tx) => {
          const product = await Product.findOne({ id: 1 });
          expect(product).toBeDefined();

          product!.stock = 5;
          product!.price = 900;
          await product!.save();
        });

        // Then
        const updated = await context.executeSql('SELECT * FROM "product" WHERE id = 1');
        expect(updated.rows[0].stock).toBe(5);
        expect(parseFloat(updated.rows[0].price)).toBe(900);
      },
      {
        entityFile: 'packages/orm/test/transaction/transaction-integration.spec.ts',
        connection: { port: 5433 },
      }
    );
  });

  test('Given - Transação com captura de erro interno / When - Erro capturado / Then - Transação externa deve continuar', async () => {
    await withDatabase(
      [DDL_PRODUCT],
      async (context) => {
        // Given
        const product1 = new Product();
        product1.id = 1;
        product1.name = 'Laptop';
        product1.price = 1000;
        product1.stock = 10;

        const product3 = new Product();
        product3.id = 3;
        product3.name = 'Keyboard';
        product3.price = 75;
        product3.stock = 50;

        // When
        try {
          await context.orm.transaction(async (tx) => {
            await product1.save(); // Deve ser commitado

            try {
              // Simulated failing operation
              throw new Error('Inner error');
            } catch (innerError) {
              // Captured, but the outer transaction should continue
            }

            // Continuar com sucesso
            await product3.save();
          });
        } catch (error) {
          // Should not reach here
          expect(true).toBe(false);
        }

        // Then - Since the inner error was captured, the outer transaction should have committed
        const products = await context.executeSql('SELECT * FROM "product" ORDER BY id');
        expect(products.rows.length).toBe(2);
        expect(products.rows[0].name).toBe('Laptop');
        expect(products.rows[1].name).toBe('Keyboard');
      },
      {
        entityFile: 'packages/orm/test/transaction/transaction-integration.spec.ts',
        connection: { port: 5433 },
      }
    );
  });
});
