import type { ValidatorAdapter, ValidationResult, ValidationError } from './ValidatorAdapter';
import { VALIDATION_SCHEMA, getSchema } from './ValidatorAdapter';

/**
 * Zod Adapter - Default validation adapter for Turbo.
 * 
 * Usage:
 * ```typescript
 * import { z } from 'zod';
 * 
 * @Schema(z.object({
 *   name: z.string().min(1),
 *   email: z.string().email()
 * }))
 * class CreateUserDto {
 *   name: string;
 *   email: string;
 * }
 * ```
 */
export class ZodAdapter implements ValidatorAdapter {
    readonly name = 'ZodAdapter';

    // Cache parsed schemas for performance
    private schemaCache = new Map<any, any>();

    hasValidation(target: any): boolean {
        return getSchema(target) !== undefined;
    }

    validate<T>(target: any, value: unknown): ValidationResult<T> {
        const schema = this.getOrCacheSchema(target);

        if (!schema) {
            return { success: true, data: value as T };
        }

        const result = schema.safeParse(value);

        if (result.success) {
            return { success: true, data: result.data };
        }

        return {
            success: false,
            errors: this.formatErrors(result.error)
        };
    }

    validateOrThrow<T>(target: any, value: unknown): T {
        const schema = this.getOrCacheSchema(target);

        if (!schema) {
            return value as T;
        }

        const result = schema.safeParse(value);

        if (result.success) {
            return result.data;
        }

        const errors = this.formatErrors(result.error);
        throw new ValidationException(errors);
    }

    private getOrCacheSchema(target: any): any {
        let schema = this.schemaCache.get(target);

        if (schema === undefined) {
            schema = getSchema(target) ?? null;
            this.schemaCache.set(target, schema);
        }

        return schema;
    }

    private formatErrors(zodError: any): ValidationError[] {
        return zodError.issues.map((issue: any) => ({
            path: issue.path.join('.'),
            message: issue.message
        }));
    }
}

/**
 * Validation exception thrown when validation fails.
 */
export class ValidationException extends Error {
    constructor(public readonly errors: ValidationError[]) {
        super(`Validation failed: ${errors.map(e => `${e.path}: ${e.message}`).join(', ')}`);
        this.name = 'ValidationException';
    }

    toResponse(): Response {
        return Response.json({
            statusCode: 400,
            message: 'Validation failed',
            errors: this.errors
        }, { status: 400 });
    }
}
