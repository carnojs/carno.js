import { describe, it, expect } from "bun:test";
import { z } from "zod";
import { ZodAdapter } from "../../src/validation/adapters/ZodAdapter";
import { Metadata } from "../../src/domain/Metadata";
import { VALIDATION_ZOD_SCHEMA } from "../../src/constants";
import { HttpException } from "../../src/exceptions/HttpException";

describe("ZodAdapter", () => {
  describe("getName", () => {
    it("should return the adapter name", () => {
      // Given
      const adapter = new ZodAdapter();

      // When
      const name = adapter.getName();

      // Then
      expect(name).toBe("ZodAdapter");
    });
  });

  describe("hasValidation", () => {
    it("should return true when class has Zod schema metadata", () => {
      // Given
      const schema = z.object({ name: z.string() });

      class TestDto {
        name: string;
      }

      Metadata.set(VALIDATION_ZOD_SCHEMA, schema, TestDto);

      const adapter = new ZodAdapter();

      // When
      const result = adapter.hasValidation(TestDto);

      // Then
      expect(result).toBe(true);
    });

    it("should return false when class has no Zod schema metadata", () => {
      // Given
      class TestDto {
        name: string;
      }

      const adapter = new ZodAdapter();

      // When
      const result = adapter.hasValidation(TestDto);

      // Then
      expect(result).toBe(false);
    });
  });

  describe("validateAndTransform", () => {
    it("should validate and return data on success", () => {
      // Given
      const schema = z.object({
        name: z.string().min(3),
        age: z.number(),
      });

      class TestDto {
        name: string;
        age: number;
      }

      Metadata.set(VALIDATION_ZOD_SCHEMA, schema, TestDto);

      const adapter = new ZodAdapter();
      const input = { name: "John", age: 25 };

      // When
      const result = adapter.validateAndTransform(TestDto, input);

      // Then
      expect(result).toEqual({ name: "John", age: 25 });
    });

    it("should transform string numbers to numbers when schema expects number", () => {
      // Given
      const schema = z.object({
        age: z.coerce.number(),
      });

      class TestDto {
        age: number;
      }

      Metadata.set(VALIDATION_ZOD_SCHEMA, schema, TestDto);

      const adapter = new ZodAdapter();
      const input = { age: "25" };

      // When
      const result = adapter.validateAndTransform(TestDto, input);

      // Then
      expect(result).toEqual({ age: 25 });
    });

    it("should throw HttpException with formatted errors on validation failure", () => {
      // Given
      const schema = z.object({
        name: z.string().min(3),
        email: z.string().email(),
      });

      class TestDto {
        name: string;
        email: string;
      }

      Metadata.set(VALIDATION_ZOD_SCHEMA, schema, TestDto);

      const adapter = new ZodAdapter();
      const input = { name: "Jo", email: "invalid" };

      // When / Then
      try {
        adapter.validateAndTransform(TestDto, input);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.statusCode).toBe(400);
        expect(Array.isArray(error.message)).toBe(true);
        expect(error.message).toHaveLength(2);

        const nameError = error.message.find((e: any) => e.field === "name");
        const emailError = error.message.find((e: any) => e.field === "email");

        expect(nameError).toBeDefined();
        expect(nameError.messages).toBeInstanceOf(Array);
        expect(nameError.messages.length).toBeGreaterThan(0);

        expect(emailError).toBeDefined();
        expect(emailError.messages).toBeInstanceOf(Array);
        expect(emailError.messages.length).toBeGreaterThan(0);
      }
    });

    it("should handle nested object validation", () => {
      // Given
      const schema = z.object({
        user: z.object({
          name: z.string(),
          age: z.number(),
        }),
      });

      class TestDto {
        user: { name: string; age: number };
      }

      Metadata.set(VALIDATION_ZOD_SCHEMA, schema, TestDto);

      const adapter = new ZodAdapter();
      const input = { user: { name: "John", age: "invalid" } };

      // When / Then
      try {
        adapter.validateAndTransform(TestDto, input);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.statusCode).toBe(400);

        const ageError = error.message.find((e: any) => e.field === "user.age");
        expect(ageError).toBeDefined();
      }
    });

    it("should handle array validation", () => {
      // Given
      const schema = z.object({
        tags: z.array(z.string().min(2)),
      });

      class TestDto {
        tags: string[];
      }

      Metadata.set(VALIDATION_ZOD_SCHEMA, schema, TestDto);

      const adapter = new ZodAdapter();
      const input = { tags: ["ok", "a"] }; // Second tag too short

      // When / Then
      try {
        adapter.validateAndTransform(TestDto, input);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.statusCode).toBe(400);

        const tagError = error.message.find((e: any) =>
          e.field.includes("tags")
        );
        expect(tagError).toBeDefined();
      }
    });

    it("should return value unchanged when no schema is attached", () => {
      // Given
      class TestDto {
        name: string;
      }

      const adapter = new ZodAdapter();
      const input = { name: "John" };

      // When
      const result = adapter.validateAndTransform(TestDto, input);

      // Then
      expect(result).toEqual(input);
    });

    it("should handle optional fields", () => {
      // Given
      const schema = z.object({
        name: z.string(),
        email: z.string().email().optional(),
      });

      class TestDto {
        name: string;
        email?: string;
      }

      Metadata.set(VALIDATION_ZOD_SCHEMA, schema, TestDto);

      const adapter = new ZodAdapter();
      const input = { name: "John" };

      // When
      const result = adapter.validateAndTransform(TestDto, input);

      // Then
      expect(result).toEqual({ name: "John" });
    });
  });

  describe("getOptions", () => {
    it("should return the adapter options", () => {
      // Given
      const options = { customOption: "test" };
      const adapter = new ZodAdapter(options);

      // When
      const result = adapter.getOptions();

      // Then
      expect(result).toEqual(options);
    });

    it("should return empty object when no options provided", () => {
      // Given
      const adapter = new ZodAdapter();

      // When
      const result = adapter.getOptions();

      // Then
      expect(result).toEqual({});
    });
  });
});
