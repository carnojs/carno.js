import { describe, it, expect } from "bun:test";
import { IsString, IsEmail, IsInt, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ClassValidatorAdapter } from "../../src/validation/adapters/ClassValidatorAdapter";
import { HttpException } from "../../src/exceptions/HttpException";

describe("ClassValidatorAdapter", () => {
  describe("getName", () => {
    it("should return the adapter name", () => {
      // Given
      const adapter = new ClassValidatorAdapter();

      // When
      const name = adapter.getName();

      // Then
      expect(name).toBe("ClassValidatorAdapter");
    });
  });

  describe("hasValidation", () => {
    it("should return true when class has class-validator decorators", () => {
      // Given
      class TestDto {
        @IsString()
        name: string;
      }

      const adapter = new ClassValidatorAdapter();

      // When
      const result = adapter.hasValidation(TestDto);

      // Then
      expect(result).toBe(true);
    });

    it("should return false when class has no validation decorators", () => {
      // Given
      class TestDto {
        name: string;
      }

      const adapter = new ClassValidatorAdapter();

      // When
      const result = adapter.hasValidation(TestDto);

      // Then
      expect(result).toBe(false);
    });
  });

  describe("validateAndTransform", () => {
    it("should validate and return transformed instance on success", () => {
      // Given
      class TestDto {
        @IsString()
        name: string;

        @IsInt()
        age: number;
      }

      const adapter = new ClassValidatorAdapter();
      const input = { name: "John", age: 25 };

      // When
      const result = adapter.validateAndTransform(TestDto, input);

      // Then
      expect(result).toBeInstanceOf(TestDto);
      expect(result.name).toBe("John");
      expect(result.age).toBe(25);
    });

    it("should transform plain object to class instance", () => {
      // Given
      class UserDto {
        @IsString()
        name: string;

        @IsEmail()
        email: string;
      }

      const adapter = new ClassValidatorAdapter();
      const input = { name: "John", email: "john@example.com" };

      // When
      const result = adapter.validateAndTransform(UserDto, input);

      // Then
      expect(result).toBeInstanceOf(UserDto);
      expect(result.constructor.name).toBe("UserDto");
    });

    it("should throw HttpException with formatted errors on validation failure", () => {
      // Given
      class TestDto {
        @IsString()
        name: string;

        @IsEmail()
        email: string;

        @IsInt()
        @Min(18)
        age: number;
      }

      const adapter = new ClassValidatorAdapter();
      const input = { name: 123, email: "invalid", age: 15 };

      // When / Then
      try {
        adapter.validateAndTransform(TestDto, input);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.statusCode).toBe(400);
        expect(Array.isArray(error.message)).toBe(true);
        expect(error.message.length).toBeGreaterThan(0);
      }
    });

    it("should format errors with field and messages structure", () => {
      // Given
      class TestDto {
        @IsString()
        name: string;
      }

      const adapter = new ClassValidatorAdapter();
      const input = { name: 123 };

      // When / Then
      try {
        adapter.validateAndTransform(TestDto, input);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);

        const nameError = error.message.find((e: any) => e.field === "name");
        expect(nameError).toBeDefined();
        expect(nameError.field).toBe("name");
        expect(Array.isArray(nameError.messages)).toBe(true);
        expect(nameError.messages.length).toBeGreaterThan(0);
      }
    });

    it("should use provided validator options", () => {
      // Given
      class TestDto {
        @IsString()
        name: string;
      }

      const adapter = new ClassValidatorAdapter({
        whitelist: true,
      });

      const input = { name: "John", extraField: "should be removed" };

      // When
      const result = adapter.validateAndTransform(TestDto, input);

      // Then
      expect(result.name).toBe("John");
      expect(result.extraField).toBeUndefined();
    });

    it("should handle nested object validation", () => {
      // Given
      class AddressDto {
        @IsString()
        street: string;

        @IsString()
        city: string;
      }

      class UserDto {
        @IsString()
        name: string;

        @ValidateNested()
        @Type(() => AddressDto)
        address: AddressDto;
      }

      const adapter = new ClassValidatorAdapter();
      const input = {
        name: "John",
        address: { street: 123, city: "NYC" },
      };

      // When / Then
      try {
        adapter.validateAndTransform(UserDto, input);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
      }
    });
  });

  describe("getOptions", () => {
    it("should return the adapter options", () => {
      // Given
      const options = { skipMissingProperties: true };
      const adapter = new ClassValidatorAdapter(options);

      // When
      const result = adapter.getOptions();

      // Then
      expect(result).toEqual(options);
    });

    it("should return empty object when no options provided", () => {
      // Given
      const adapter = new ClassValidatorAdapter();

      // When
      const result = adapter.getOptions();

      // Then
      expect(result).toEqual({});
    });
  });
});
