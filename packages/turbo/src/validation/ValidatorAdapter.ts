/**
 * Validation result type.
 */
export interface ValidationResult<T = any> {
    success: boolean;
    data?: T;
    errors?: ValidationError[];
}

export interface ValidationError {
    path: string;
    message: string;
}

/**
 * Base interface for validation adapters.
 * Adapters provide validation capabilities for different libraries.
 */
export interface ValidatorAdapter {
    /**
     * Validator name for debugging.
     */
    readonly name: string;

    /**
     * Check if a target has validation schema.
     */
    hasValidation(target: any): boolean;

    /**
     * Validate and transform a value.
     * Returns result object instead of throwing for better performance.
     */
    validate<T>(target: any, value: unknown): ValidationResult<T>;

    /**
     * Validate and transform, throwing on error.
     * Used when you want to short-circuit on failure.
     */
    validateOrThrow<T>(target: any, value: unknown): T;
}

/**
 * Validation configuration for Turbo.
 */
export interface ValidationConfig {
    adapter: ValidatorAdapter;
}

/**
 * Symbol for storing validation schema on DTOs.
 */
export const VALIDATION_SCHEMA = Symbol('turbo:validation');

/**
 * Decorator to attach a validation schema to a DTO class.
 */
export function Schema(schema: any): ClassDecorator {
    return (target) => {
        Reflect.defineMetadata(VALIDATION_SCHEMA, schema, target);
    };
}

/**
 * Get the validation schema from a DTO class.
 */
export function getSchema(target: any): any | undefined {
    return Reflect.getMetadata(VALIDATION_SCHEMA, target);
}
