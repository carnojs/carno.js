import { describe, expect, test } from 'bun:test';
import {
  BaseEntity,
  Entity,
  PrimaryKey,
  Property,
  Index,
  EntityStorage,
  IndexDefinition,
} from '../../src';
import { Metadata } from '@cheetah.js/core';
import { PROPERTIES_METADATA } from '../../src/constants';

function getIndexes(target: Function): IndexDefinition[] {
  const indexes = Metadata.get('indexes', target) || [];

  return indexes;
}

function getProps(target: Function) {
  const props = Metadata.get(PROPERTIES_METADATA, target) || {};

  return props;
}

describe('Index decorator', () => {
  test('property-level simple index via @Index()', () => {
    // Given: entity with simple property index
    @Entity()
    class UserA extends BaseEntity {
      @PrimaryKey()
      id: number;

      @Index()
      @Property()
      name: string;
    }

    // When: reading metadata
    const indexes = getIndexes(UserA);

    // Then: contains single-column index for name
    const match = indexes.find((i) => i.name === 'name_index');
    expect(match?.properties).toEqual(['name']);
  });

  test('property-level compound index via object options', () => {
    // Given: entity with multiple properties and compound index declared on a property
    @Entity()
    class UserB extends BaseEntity {
      @PrimaryKey()
      id: number;

      @Property()
      user: string;

      @Property()
      course: string;

      @Index<{ UserB }>({ properties: ['user', 'course', 'themeName'] })
      @Property()
      themeName: string;
    }

    // When: reading metadata
    const indexes = getIndexes(UserB);

    // Then: contains compound index
    const match = indexes.find((i) => i.name === 'user_course_themeName_index');
    expect(match?.properties).toEqual(['user', 'course', 'themeName']);
  });

  test('class-level compound index via object options', () => {
    // Given: class-level compound index
    @Entity()
    @Index<{ any }>({ properties: ['name', 'email'] })
    class UserC extends BaseEntity {
      @PrimaryKey()
      id: number;

      @Property()
      name: string;

      @Property()
      email: string;
    }

    // When: reading metadata
    const indexes = getIndexes(UserC);

    // Then: contains compound index
    const match = indexes.find((i) => i.name === 'name_email_index');
    expect(match?.properties).toEqual(['name', 'email']);
  });

  test('class-level compound index via array (backward compatible)', () => {
    // Given: class-level compound index using array
    @Entity()
    @Index(['name', 'email'])
    class UserD extends BaseEntity {
      @PrimaryKey()
      id: number;

      @Property()
      name: string;

      @Property()
      email: string;
    }

    // When: reading metadata
    const indexes = getIndexes(UserD);

    // Then: contains compound index
    const match = indexes.find((i) => i.name === 'name_email_index');
    expect(match?.properties).toEqual(['name', 'email']);
  });

  test('property-level index via array (backward compatible)', () => {
    // Given: property-level index using array
    @Entity()
    class UserE extends BaseEntity {
      @PrimaryKey()
      id: number;

      @Index(['name'])
      @Property()
      name: string;
    }

    // When: reading metadata
    const indexes = getIndexes(UserE);

    // Then: contains simple index
    const match = indexes.find((i) => i.name === 'name_index');
    expect(match?.properties).toEqual(['name']);
  });

  test('primary key auto index is registered and mapped by EntityStorage', () => {
    // Given: entity with primary key
    @Entity()
    class PkIndexUser extends BaseEntity {
      @PrimaryKey()
      id: number;

      @Property()
      name: string;
    }

    // When: read raw metadata
    const metaIndexes = getIndexes(PkIndexUser);
    const pkMeta = metaIndexes.find((i) => i.name === '[TABLE]_pkey');

    // Then: raw metadata contains template pkey index
    expect(pkMeta?.properties).toEqual(['id']);

    // When: map through EntityStorage
    const storage = new EntityStorage();
    const props = getProps(PkIndexUser);
    storage.add({ target: PkIndexUser, options: {} }, props as any, [], []);
    const entry = storage.get(PkIndexUser)!;

    // Then: index is resolved to concrete table and column
    const pkey = entry.indexes?.find((i) => i.indexName === 'pk_index_user_pkey');
    expect(pkey?.columnName).toBe('id');
    expect(pkey?.table).toBe('pk_index_user');
  });

  test('combines class-level and property-level indexes', () => {
    // Given: entity with both class and property indexes
    @Entity()
    @Index(['email', 'name'])
    class UserF extends BaseEntity {
      @PrimaryKey()
      id: number;

      @Index()
      @Property()
      email: string;

      @Property()
      name: string;
    }

    // When: reading metadata
    const indexes = getIndexes(UserF);

    // Then: both indexes are present
    const byEmail = indexes.find((i) => i.name === 'email_index');
    const byEmailName = indexes.find((i) => i.name === 'email_name_index');
    expect(byEmail?.properties).toEqual(['email']);
    expect(byEmailName?.properties).toEqual(['email', 'name']);
  });

  test('resolves partial index predicate using column map', () => {
    // Given: entity with partial index predicate
    @Entity()
    @Index<{ UserG }>({
      properties: ['email'],
      where: (columns) => `${columns.isActive} = true`,
    })
    class UserG extends BaseEntity {
      @PrimaryKey()
      id: number;

      @Property()
      email: string;

      @Property()
      isActive: boolean;
    }

    // When: mapping to storage
    const storage = new EntityStorage();
    const props = getProps(UserG);
    storage.add({ target: UserG, options: {} }, props as any, [], []);
    const entry = storage.get(UserG)!;

    // Then: predicate is resolved with column names
    const index = entry.indexes?.find((i) => i.indexName === 'email_index');
    expect(index?.where).toBe('is_active = true');
  });

  test('throws when using class-level without properties', () => {
    // Given/When/Then: defining class with @Index() on class without options throws
    const define = () => {
      @Entity()
      // @ts-expect-error intentional misuse to assert runtime error
      @Index()
      class BadIndex extends BaseEntity {
        @PrimaryKey()
        id: number;
      }

      return BadIndex;
    };

    expect(define).toThrow('@Index on class requires properties option');
  });

  test('scopes index metadata to declaring entity', () => {
    // Given: hierarchy where only one subclass defines composite index
    @Entity()
    class ScopedBase extends BaseEntity {
      @PrimaryKey()
      id: number;
    }

    @Entity()
    class PlainChild extends ScopedBase {
      @Property()
      label: string;
    }

    @Entity()
    class IndexedChild extends ScopedBase {
      @Property()
      user: string;

      @Property()
      course: string;

      @Index<{ IndexedChild }>({ properties: ['user', 'course', 'title'] })
      @Property()
      title: string;
    }

    // When: reading metadata across the hierarchy
    const baseIndexes = Metadata.get('indexes', ScopedBase) || [];
    const plainIndexes = Metadata.get('indexes', PlainChild) || [];
    const indexedIndexes = Metadata.get('indexes', IndexedChild) || [];

    // Then: base metadata keeps only primary key, siblings stay clean, subclass keeps index
    expect(baseIndexes).toEqual([{ name: '[TABLE]_pkey', properties: ['id'] }]);
    expect(plainIndexes.some((index) => index.name.includes('user_course'))).toBe(false);
    const scopedIndex = indexedIndexes.find((index) => index.name === 'user_course_title_index');
    expect(scopedIndex?.properties).toEqual(['user', 'course', 'title']);

    Metadata.delete('indexes', ScopedBase);
    Metadata.delete('indexes', PlainChild);
    Metadata.delete('indexes', IndexedChild);
  });
});
