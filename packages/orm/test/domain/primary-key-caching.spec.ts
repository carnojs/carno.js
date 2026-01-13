import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { app, execute, purgeDatabase, startDatabase } from '../node-database';
import { BaseEntity, Entity, PrimaryKey, Property } from '../../src';
import { EntityStorage } from '../../src/domain/entities';

@Entity()
class UserWithDefaultPK extends BaseEntity {
    @PrimaryKey()
    id: number;

    @Property()
    name: string;
}

@Entity()
class ProductWithCustomPK extends BaseEntity {
    @PrimaryKey()
    productId: string;

    @Property()
    name: string;

    @Property()
    price: number;
}

@Entity()
class UserWithCustomColumn extends BaseEntity {
    @PrimaryKey({ columnName: 'user_uuid' })
    uuid: string;

    @Property()
    email: string;
}

@Entity()
class EntityWithManyProps extends BaseEntity {
    @Property()
    prop1: string;

    @Property()
    prop2: string;

    @Property()
    prop3: string;

    @PrimaryKey()
    customId: number;

    @Property()
    prop5: string;

    @Property()
    prop6: string;
}

/**
 * Unit tests for primary key caching optimization
 * These tests verify that primary key metadata is cached during entity registration
 * for O(1) lookups instead of O(n) property iteration
 */
describe('Primary Key Caching', () => {
    let entityStorage: EntityStorage;

    beforeEach(async () => {
        await startDatabase();
        entityStorage = EntityStorage.getInstance();
    });

    afterEach(async () => {
        await purgeDatabase();
        await app?.disconnect();
    });

    test('should cache primary key property name during registration', () => {
        const options = entityStorage.get(UserWithDefaultPK);

        expect(options).toBeDefined();
        expect(options!._primaryKeyPropertyName).toBe('id');
    });

    test('should cache custom primary key property name', () => {
        const options = entityStorage.get(ProductWithCustomPK);

        expect(options).toBeDefined();
        expect(options!._primaryKeyPropertyName).toBe('productId');
    });

    test('should cache primary key column name with custom column', () => {
        const options = entityStorage.get(UserWithCustomColumn);

        expect(options).toBeDefined();
        expect(options!._primaryKeyPropertyName).toBe('uuid');
        expect(options!._primaryKeyColumnName).toBe('user_uuid');
    });

    test('should cache primary key column name matching property name when not custom', () => {
        const options = entityStorage.get(UserWithDefaultPK);

        expect(options).toBeDefined();
        expect(options!._primaryKeyPropertyName).toBe('id');
        expect(options!._primaryKeyColumnName).toBe('id');
    });

    test('should cache primary key for entity with many properties', () => {
        const options = entityStorage.get(EntityWithManyProps);

        expect(options).toBeDefined();
        expect(options!._primaryKeyPropertyName).toBe('customId');
        expect(options!._primaryKeyColumnName).toBe('custom_id');
    });

    test('cache should be available immediately after registration', () => {
        const options = entityStorage.get(ProductWithCustomPK);

        // Verify cache exists without iteration
        expect(options!._primaryKeyPropertyName).toBeDefined();
        expect(options!._primaryKeyColumnName).toBeDefined();
        expect(options!._primaryKeyPropertyName).toBe('productId');
    });
});
