import { describe, expect, it } from 'bun:test';
import { IsString } from 'class-validator';

import { Context } from '../src/domain/Context';
import {
  analyzeParamDecorator,
  createParamResolver,
  createParamResolvers,
  hasAnyDIParam,
} from '../src/route/ParamResolverFactory';

describe('ParamResolverFactory', () => {
  describe('analyzeParamDecorator', () => {
    it('should identify body decorator', () => {
      // Given
      const meta = {
        fun: (context: Context, data?: string) =>
          data ? context.body[data] : context.body,
        param: 'name',
      };

      // When
      const info = analyzeParamDecorator(meta, String);

      // Then
      expect(info.type).toBe('body');
      expect(info.key).toBe('name');
      expect(info.needsValidation).toBe(false);
    });

    it('should respect explicit param type metadata', () => {
      // Given
      const resolver = (context: Context) => context.body;
      const meta = {
        fun: resolver,
        param: 'name',
        type: 'body',
      };

      resolver.toString = () => 'minified';

      // When
      const info = analyzeParamDecorator(meta, String);

      // Then
      expect(info.type).toBe('body');
      expect(info.key).toBe('name');
    });

    it('should identify query decorator', () => {
      // Given
      const meta = {
        fun: (context: Context, data?: string) =>
          data ? context.query[data] : context.query,
        param: 'page',
      };

      // When
      const info = analyzeParamDecorator(meta, Number);

      // Then
      expect(info.type).toBe('query');
      expect(info.key).toBe('page');
    });

    it('should identify param decorator', () => {
      // Given
      const meta = {
        fun: (context: Context, data?: string) =>
          data ? context.param[data] : null,
        param: 'id',
      };

      // When
      const info = analyzeParamDecorator(meta, String);

      // Then
      expect(info.type).toBe('param');
      expect(info.key).toBe('id');
    });

    it('should return di type when no decorator', () => {
      // Given/When
      const info = analyzeParamDecorator(undefined, String);

      // Then
      expect(info.type).toBe('di');
    });

    it('should detect validation needed', () => {
      // Given
      class TestDto {
        @IsString()
        name!: string;
      }

      const meta = {
        fun: (context: Context) => context.body,
        param: undefined,
      };

      // When
      const info = analyzeParamDecorator(meta, TestDto);

      // Then
      expect(info.needsValidation).toBe(true);
    });
  });

  describe('createParamResolver', () => {
    it('should create resolver for body', () => {
      // Given
      const meta = {
        fun: (context: Context, data?: string) =>
          data ? context.body[data] : context.body,
        param: 'name',
      };

      const context = new Context();
      context.body = { name: 'John' };

      // When
      const resolver = createParamResolver(meta, String);

      // Then
      expect(resolver).not.toBeNull();
      expect(resolver!(context)).toBe('John');
    });

    it('should return null for di params', () => {
      // Given/When
      const resolver = createParamResolver(undefined, String);

      // Then
      expect(resolver).toBeNull();
    });

    it('should validate when needed', () => {
      // Given
      class TestDto {
        @IsString()
        name!: string;
      }

      const meta = {
        fun: (context: Context) => context.body,
        param: undefined,
      };

      const context = new Context();
      context.body = { name: 123 };

      // When
      const resolver = createParamResolver(meta, TestDto);

      // Then
      expect(() => resolver!(context)).toThrow();
    });
  });

  describe('createParamResolvers', () => {
    it('should create resolvers for multiple params', () => {
      // Given
      const metas = {
        0: {
          fun: (context: Context, data?: string) =>
            data ? context.param[data] : null,
          param: 'id',
        },
        1: {
          fun: (context: Context, data?: string) =>
            data ? context.query[data] : context.query,
          param: 'page',
        },
      };

      const argTypes = [String, Number];

      // When
      const resolvers = createParamResolvers(metas, argTypes);

      // Then
      expect(resolvers.length).toBe(2);
      expect(resolvers[0]).not.toBeNull();
      expect(resolvers[1]).not.toBeNull();
    });
  });

  describe('hasAnyDIParam', () => {
    it('should return true when has DI param', () => {
      // Given
      const resolvers = [() => 'test', null, () => 'test'];

      // When/Then
      expect(hasAnyDIParam(resolvers)).toBe(true);
    });

    it('should return false when no DI params', () => {
      // Given
      const resolvers = [() => 'test', () => 'other'];

      // When/Then
      expect(hasAnyDIParam(resolvers)).toBe(false);
    });
  });
});
