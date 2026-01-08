import type { ValidatorAdapter, ValidationResult, ValidationError } from './ValidatorAdapter';
import { VALIDATION_SCHEMA, getSchema } from './ValidatorAdapter';
import { ValidationException } from './ZodAdapter';

/**
 * Valibot Adapter for Turbo validation.
 * 
 * Usage:
 * ```typescript
 * import * as v from 'valibot';
 * 
 * @Schema(v.object({
 *   name: v.pipe(v.string(), v.minLength(1)),
 *   email: v.pipe(v.string(), v.email())
 * }))
 * class CreateUserDto {
 *   name: string;
 *   email: string;
 * }
 * ```
 */
export class ValibotAdapter implements ValidatorAdapter {
    readonly name = 'ValibotAdapter';

    private schemaCache = new Map<any, any>();
    private valibot: any = null;

    constructor() {
        // Lazy load valibot
        try {
            this.valibot = require('valibot');
        } catch {
            // Will be loaded on first use
        }
    }

    private ensureValibot(): any {
        if (!this.valibot) {
            this.valibot = require('valibot');
        }
        return this.valibot;
    }

    hasValidation(target: any): boolean {
        return getSchema(target) !== undefined;
    }

    validate<T>(target: any, value: unknown): ValidationResult<T> {
        const schema = this.getOrCacheSchema(target);

        if (!schema) {
            return { success: true, data: value as T };
        }

        const v = this.ensureValibot();
        const result = v.safeParse(schema, value);

        if (result.success) {
            return { success: true, data: result.output };
        }

        return {
            success: false,
            errors: this.formatErrors(result.issues)
        };
    }

    validateOrThrow<T>(target: any, value: unknown): T {
        const result = this.validate<T>(target, value);

        if (result.success) {
            return result.data!;
        }

        throw new ValidationException(result.errors!);
    }

    private getOrCacheSchema(target: any): any {
        let schema = this.schemaCache.get(target);

        if (schema === undefined) {
            schema = getSchema(target) ?? null;
            this.schemaCache.set(target, schema);
        }

        return schema;
    }

    private formatErrors(issues: any[]): ValidationError[] {
        return issues.map((issue: any) => ({
            path: issue.path?.map((p: any) => p.key).join('.') || '',
            message: issue.message
        }));
    }
}
