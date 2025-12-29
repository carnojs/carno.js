import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { Context } from '@cheetah.js/core';
import { IdentityMapMiddleware } from '../../src/middleware/identity-map.middleware';
import { identityMapContext } from '../../src/identity-map';
import { app, execute, purgeDatabase, startDatabase } from '../node-database';
import { BaseEntity, Entity, PrimaryKey, Property } from '../../src';

describe('IdentityMapMiddleware', () => {
  const DDL_USER = `
    CREATE TABLE "user" (
      "id" SERIAL PRIMARY KEY,
      "email" varchar(255) NOT NULL
    );
  `;

  @Entity()
  class User extends BaseEntity {
    @PrimaryKey()
    id: number;

    @Property()
    email: string;
  }

  beforeEach(async () => {
    await startDatabase();
    await execute(DDL_USER);
  });

  afterEach(async () => {
    await purgeDatabase();
    await app?.disconnect();
  });

  test('When middleware is used, Then identity map context is active', async () => {
    // Given
    const middleware = new IdentityMapMiddleware();
    const mockContext = {} as Context;
    let contextWasActive = false;

    // When
    await middleware.handle(mockContext, async () => {
      contextWasActive = identityMapContext.hasContext();
    });

    // Then
    expect(contextWasActive).toBe(true);
  });

  test('When middleware wraps queries, Then entities are cached', async () => {
    // Given
    await User.create({ id: 1, email: 'test@test.com' });
    const middleware = new IdentityMapMiddleware();
    const mockContext = {} as Context;
    let user1: User | null = null;
    let user2: User | null = null;

    // When
    await middleware.handle(mockContext, async () => {
      user1 = await User.findOne({ id: 1 });
      user2 = await User.findOne({ id: 1 });
    });

    // Then
    expect(user1).toBe(user2);
  });

  test('When middleware completes, Then context is cleaned up', async () => {
    // Given
    const middleware = new IdentityMapMiddleware();
    const mockContext = {} as Context;

    // When
    await middleware.handle(mockContext, async () => {
      // Do nothing
    });

    // Then
    expect(identityMapContext.hasContext()).toBe(false);
  });

  test('When using middleware multiple times, Then contexts are isolated', async () => {
    // Given
    await User.create({ id: 1, email: 'test@test.com' });
    const middleware = new IdentityMapMiddleware();
    const mockContext = {} as Context;
    let user1: User | null = null;
    let user2: User | null = null;

    // When
    await middleware.handle(mockContext, async () => {
      user1 = await User.findOne({ id: 1 });
    });

    await middleware.handle(mockContext, async () => {
      user2 = await User.findOne({ id: 1 });
    });

    // Then
    expect(user1).not.toBe(user2);
  });
});
