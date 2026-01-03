import { describe, expect, it, beforeEach } from 'bun:test';
import { IsString } from 'class-validator';

import { Context } from '../src/domain/Context';
import { analyzeParamDecorator } from '../src/route/ParamResolverFactory';
import { setValidatorAdapter } from '../src/utils/ValidationCache';
import { ClassValidatorAdapter } from '../src/validation/adapters/ClassValidatorAdapter';

describe('ParamResolverFactory', () => {
  beforeEach(() => {
    setValidatorAdapter(new ClassValidatorAdapter());
  });
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
});
