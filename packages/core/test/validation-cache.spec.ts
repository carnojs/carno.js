import { describe, expect, it, beforeEach } from 'bun:test';
import { IsString } from 'class-validator';

import {
  isValidatable,
  preloadValidationForParams,
  clearValidationCache,
  setValidatorAdapter,
} from '../src/utils/ValidationCache';
import { ClassValidatorAdapter } from '../src/validation/adapters/ClassValidatorAdapter';

describe('ValidationCache', () => {
  beforeEach(() => {
    clearValidationCache();
    setValidatorAdapter(new ClassValidatorAdapter());
  });

  describe('isValidatable', () => {
    it('should return true for class with validators', () => {
      // Given
      class TestDto {
        @IsString()
        name!: string;
      }

      // When
      const result = isValidatable(TestDto);

      // Then
      expect(result).toBe(true);
    });

    it('should return false for class without validators', () => {
      // Given
      class PlainClass {
        name!: string;
      }

      // When
      const result = isValidatable(PlainClass);

      // Then
      expect(result).toBe(false);
    });

    it('should cache the result', () => {
      // Given
      class TestDto {
        @IsString()
        name!: string;
      }

      // When
      const first = isValidatable(TestDto);
      const second = isValidatable(TestDto);

      // Then
      expect(first).toBe(true);
      expect(second).toBe(true);
    });
  });

  describe('preloadValidationForParams', () => {
    it('should return indices of validatable params', () => {
      // Given
      class ValidDto {
        @IsString()
        name!: string;
      }

      class PlainClass {
        name!: string;
      }

      const args = [String, ValidDto, PlainClass, ValidDto];

      // When
      const indices = preloadValidationForParams(args);

      // Then
      expect(indices).toEqual([1, 3]);
    });

    it('should return empty array when no validatable params', () => {
      // Given
      const args = [String, Number, Object];

      // When
      const indices = preloadValidationForParams(args);

      // Then
      expect(indices).toEqual([]);
    });
  });
});
