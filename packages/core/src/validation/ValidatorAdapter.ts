/**
 * Base interface for validation adapters
 * Adapters provide validation capabilities for different libraries (Zod, class-validator, etc.)
 */
export interface ValidatorAdapter<TOptions = any> {
  /**
   * Checks if a class/function has validation metadata
   * Used by ValidationCache for detection and optimization
   * 
   * @param target - The class/function to check
   * @returns true if validation metadata exists
   */
  hasValidation(target: Function): boolean;

  /**
   * Validates and transforms a value to the target type
   * 
   * @param target - The DTO class to validate against
   * @param value - The raw value to validate (usually from request body/query/params)
   * @returns Transformed and validated instance
   * @throws HttpException with formatted errors on validation failure
   */
  validateAndTransform(target: Function, value: any): any;

  /**
   * Get the name of the validator (for debugging/logging)
   * 
   * @returns The validator name (e.g., "ZodAdapter", "ClassValidatorAdapter")
   */
  getName(): string;

  /**
   * Get the adapter options (for internal use)
   */
  getOptions(): TOptions;
}

/**
 * Constructor type for validator adapters
 */
export type ValidatorAdapterConstructor<TOptions = any> = new (
  options?: TOptions
) => ValidatorAdapter<TOptions>;

/**
 * Type to extract options type from a ValidatorAdapter constructor
 */
export type ValidatorAdapterOptions<TAdapter> = TAdapter extends new (
  options?: infer TOptions
) => any
  ? TOptions
  : never;

/**
 * Validation configuration with adapter and options
 */
export interface ValidationConfig<
  TAdapter extends ValidatorAdapterConstructor = ValidatorAdapterConstructor
> {
  adapter?: TAdapter;
  options?: ValidatorAdapterOptions<TAdapter>;
}

/**
 * Helper function to create a strongly-typed validation config.
 * Use this to get proper autocomplete for adapter options.
 *
 * @example
 * ```typescript
 * const app = new Carno({
 *   validation: defineValidation({
 *     adapter: ClassValidatorAdapter,
 *     options: { whitelist: true } // ✓ Autocomplete works!
 *   })
 * });
 * ```
 */
export function defineValidation<TAdapter extends ValidatorAdapterConstructor>(
  config: { adapter: TAdapter; options?: ValidatorAdapterOptions<TAdapter> }
): ValidationConfig<TAdapter> {
  return config;
}
