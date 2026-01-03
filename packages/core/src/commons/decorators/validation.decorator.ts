import { z } from "zod";
import { Metadata } from "../../domain/Metadata";
import { VALIDATION_ZOD_SCHEMA } from "../../constants";

/**
 * Decorator to attach a Zod schema to a DTO class
 * The schema will be used for validation when the DTO is used in route handlers
 *
 * @example
 * ```typescript
 * const CreateUserSchema = z.object({
 *   name: z.string().min(3),
 *   email: z.string().email()
 * });
 *
 * @ZodSchema(CreateUserSchema)
 * class CreateUserDto {
 *   name: string;
 *   email: string;
 * }
 *
 * @Controller('/users')
 * class UserController {
 *   @Post()
 *   create(@Body() dto: CreateUserDto) {
 *     // dto is validated and typed
 *     return dto;
 *   }
 * }
 * ```
 *
 * @param schema - The Zod schema to use for validation
 * @returns Class decorator
 */
export function ZodSchema<T extends z.ZodType>(schema: T): ClassDecorator {
  return (target: Function) => {
    Metadata.set(VALIDATION_ZOD_SCHEMA, schema, target);
  };
}
