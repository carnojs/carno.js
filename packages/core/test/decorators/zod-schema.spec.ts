import { describe, it, expect } from "bun:test";
import { z } from "zod";
import { ZodSchema } from "../../src/commons/decorators/validation.decorator";
import { Metadata } from "../../src/domain/Metadata";
import { VALIDATION_ZOD_SCHEMA } from "../../src/constants";

describe("@ZodSchema", () => {
  it("should store schema in metadata", () => {
    // Given
    const schema = z.object({
      name: z.string(),
      email: z.string().email(),
    });

    // When
    @ZodSchema(schema)
    class TestDto {
      name: string;
      email: string;
    }

    // Then
    const storedSchema = Metadata.get(VALIDATION_ZOD_SCHEMA, TestDto);
    expect(storedSchema).toBe(schema);
  });

  it("should allow retrieving schema from decorated class", () => {
    // Given
    const schema = z.object({
      id: z.number(),
      name: z.string(),
    });

    @ZodSchema(schema)
    class UserDto {
      id: number;
      name: string;
    }

    // When
    const retrievedSchema = Metadata.get(VALIDATION_ZOD_SCHEMA, UserDto);

    // Then
    expect(retrievedSchema).toBe(schema);
    expect(retrievedSchema).toBeDefined();
  });

  it("should work with complex nested schemas", () => {
    // Given
    const addressSchema = z.object({
      street: z.string(),
      city: z.string(),
      zip: z.string(),
    });

    const userSchema = z.object({
      name: z.string(),
      address: addressSchema,
      tags: z.array(z.string()),
    });

    // When
    @ZodSchema(userSchema)
    class ComplexDto {
      name: string;
      address: {
        street: string;
        city: string;
        zip: string;
      };
      tags: string[];
    }

    // Then
    const storedSchema = Metadata.get(VALIDATION_ZOD_SCHEMA, ComplexDto);
    expect(storedSchema).toBe(userSchema);
  });

  it("should work with union schemas", () => {
    // Given
    const schema = z.union([
      z.object({ type: z.literal("a"), value: z.string() }),
      z.object({ type: z.literal("b"), value: z.number() }),
    ]);

    // When
    @ZodSchema(schema)
    class UnionDto {
      type: "a" | "b";
      value: string | number;
    }

    // Then
    const storedSchema = Metadata.get(VALIDATION_ZOD_SCHEMA, UnionDto);
    expect(storedSchema).toBe(schema);
  });

  it("should allow multiple DTOs with different schemas", () => {
    // Given
    const schema1 = z.object({ name: z.string() });
    const schema2 = z.object({ email: z.string().email() });

    // When
    @ZodSchema(schema1)
    class Dto1 {
      name: string;
    }

    @ZodSchema(schema2)
    class Dto2 {
      email: string;
    }

    // Then
    const storedSchema1 = Metadata.get(VALIDATION_ZOD_SCHEMA, Dto1);
    const storedSchema2 = Metadata.get(VALIDATION_ZOD_SCHEMA, Dto2);

    expect(storedSchema1).toBe(schema1);
    expect(storedSchema2).toBe(schema2);
    expect(storedSchema1).not.toBe(storedSchema2);
  });
});
