import { describe, expect, test } from 'bun:test';
import {
  BaseEntity,
  Entity,
  PrimaryKey,
  Property,
  EntityStorage,
  Unique,
} from '../../src';
import { Metadata } from '@cheetah.js/core';
import { PROPERTIES_METADATA } from '../../src/constants';

type UniqueDefinition = {
  name: string;
  properties: string[];
};

function getUniques(target: Function): UniqueDefinition[] {
  const uniques = Metadata.get('uniques', target) || [];

  return uniques;
}

function getProps(target: Function) {
  const props = Metadata.get(PROPERTIES_METADATA, target) || {};

  return props;
}

describe('Unique decorator', () => {
  test('property-level simple unique via @Unique()', () => {
    // Given: entity with simple property unique
    @Entity()
    class UserA extends BaseEntity {
      @PrimaryKey()
      id: number;

      // @ts-expect-error Unique not yet implemented
      @Unique()
      @Property()
      email: string;
    }

    // When: reading metadata
    const uniques = getUniques(UserA);

    // Then: contains single-column unique for email
    const match = uniques.find((u) => u.name === 'email_unique');
    expect(match?.properties).toEqual(['email']);
  });

  test('property-level compound unique via object options', () => {
    // Given: entity with multiple properties and compound unique declared on a property
    @Entity()
    class UserB extends BaseEntity {
      @PrimaryKey()
      id: number;

      @Property()
      userId: string;

      @Property()
      courseId: string;

      // @ts-expect-error Unique not yet implemented
      @Unique({ properties: ['userId', 'courseId', 'enrollmentDate'] })
      @Property()
      enrollmentDate: Date;
    }

    // When: reading metadata
    const uniques = getUniques(UserB);

    // Then: contains compound unique
    const match = uniques.find((u) => u.name === 'userId_courseId_enrollmentDate_unique');
    expect(match?.properties).toEqual(['userId', 'courseId', 'enrollmentDate']);
  });

  test('class-level compound unique via object options', () => {
    // Given: class-level compound unique
    @Entity()
    // @ts-expect-error Unique not yet implemented
    @Unique({ properties: ['email', 'phoneNumber'] })
    class UserC extends BaseEntity {
      @PrimaryKey()
      id: number;

      @Property()
      email: string;

      @Property()
      phoneNumber: string;
    }

    // When: reading metadata
    const uniques = getUniques(UserC);

    // Then: contains compound unique
    const match = uniques.find((u) => u.name === 'email_phoneNumber_unique');
    expect(match?.properties).toEqual(['email', 'phoneNumber']);
  });

  test('class-level compound unique via array (backward compatible)', () => {
    // Given: class-level compound unique using array
    @Entity()
    // @ts-expect-error Unique not yet implemented
    @Unique(['email', 'username'])
    class UserD extends BaseEntity {
      @PrimaryKey()
      id: number;

      @Property()
      email: string;

      @Property()
      username: string;
    }

    // When: reading metadata
    const uniques = getUniques(UserD);

    // Then: contains compound unique
    const match = uniques.find((u) => u.name === 'email_username_unique');
    expect(match?.properties).toEqual(['email', 'username']);
  });

  test('property-level unique via array (backward compatible)', () => {
    // Given: property-level unique using array
    @Entity()
    class UserE extends BaseEntity {
      @PrimaryKey()
      id: number;

      // @ts-expect-error Unique not yet implemented
      @Unique(['email'])
      @Property()
      email: string;
    }

    // When: reading metadata
    const uniques = getUniques(UserE);

    // Then: contains simple unique
    const match = uniques.find((u) => u.name === 'email_unique');
    expect(match?.properties).toEqual(['email']);
  });

  test('unique constraint is mapped by EntityStorage', () => {
    // Given: entity with unique constraint
    @Entity()
    class UniqueUser extends BaseEntity {
      @PrimaryKey()
      id: number;

      // @ts-expect-error Unique not yet implemented
      @Unique()
      @Property()
      email: string;
    }

    // When: read raw metadata
    const metaUniques = getUniques(UniqueUser);
    const uniqueMeta = metaUniques.find((u) => u.name === 'email_unique');

    // Then: raw metadata contains unique constraint
    expect(uniqueMeta?.properties).toEqual(['email']);

    // When: map through EntityStorage
    const storage = new EntityStorage();
    const props = getProps(UniqueUser);
    storage.add({ target: UniqueUser, options: {} }, props as any, [], []);
    const entry = storage.get(UniqueUser)!;

    // Then: unique is resolved to concrete table and column
    const unique = entry.uniques?.find((u) => u.uniqueName === 'email_unique');
    expect(unique?.columnName).toBe('email');
    expect(unique?.table).toBe('unique_user');
  });

  test('combines class-level and property-level uniques', () => {
    // Given: entity with both class and property uniques
    @Entity()
    // @ts-expect-error Unique not yet implemented
    @Unique(['email', 'username'])
    class UserF extends BaseEntity {
      @PrimaryKey()
      id: number;

      // @ts-expect-error Unique not yet implemented
      @Unique()
      @Property()
      email: string;

      @Property()
      username: string;
    }

    // When: reading metadata
    const uniques = getUniques(UserF);

    // Then: both uniques are present
    const byEmail = uniques.find((u) => u.name === 'email_unique');
    const byEmailUsername = uniques.find((u) => u.name === 'email_username_unique');
    expect(byEmail?.properties).toEqual(['email']);
    expect(byEmailUsername?.properties).toEqual(['email', 'username']);
  });

  test('throws when using class-level without properties', () => {
    // Given/When/Then: defining class with @Unique() on class without options throws
    const define = () => {
      @Entity()
      // @ts-expect-error intentional misuse to assert runtime error
      @Unique()
      class BadUnique extends BaseEntity {
        @PrimaryKey()
        id: number;
      }

      return BadUnique;
    };

    expect(define).toThrow('@Unique on class requires properties option');
  });

  test('scopes unique metadata to declaring entity', () => {
    // Given: hierarchy where only one subclass defines composite unique
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
    class UniqueChild extends ScopedBase {
      @Property()
      email: string;

      @Property()
      phoneNumber: string;

      // @ts-expect-error Unique not yet implemented
      @Unique({ properties: ['email', 'phoneNumber', 'countryCode'] })
      @Property()
      countryCode: string;
    }

    // When: reading metadata across the hierarchy
    const baseUniques = Metadata.get('uniques', ScopedBase) || [];
    const plainUniques = Metadata.get('uniques', PlainChild) || [];
    const uniqueUniques = Metadata.get('uniques', UniqueChild) || [];

    // Then: base metadata has no uniques, siblings stay clean, subclass keeps unique
    expect(baseUniques).toEqual([]);
    expect(plainUniques.some((unique) => unique.name.includes('email_phoneNumber'))).toBe(false);
    const scopedUnique = uniqueUniques.find((unique) => unique.name === 'email_phoneNumber_countryCode_unique');
    expect(scopedUnique?.properties).toEqual(['email', 'phoneNumber', 'countryCode']);

    Metadata.delete('uniques', ScopedBase);
    Metadata.delete('uniques', PlainChild);
    Metadata.delete('uniques', UniqueChild);
  });
});
