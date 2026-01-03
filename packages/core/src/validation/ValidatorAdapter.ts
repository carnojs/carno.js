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
 * Type to extract options type from a ValidatorAdapter constructor
 */
export type ValidatorAdapterOptions<T> = T extends new (
  options?: infer O
) => ValidatorAdapter<any>
  ? O
  : never;

/**
 * Strongly-typed validation configuration
 * When TAdapter is specified, TOptions is automatically inferred
 */
export interface ValidationConfig<
  TAdapter extends new (options?: any) => ValidatorAdapter = new (
    options?: any
  ) => ValidatorAdapter
> {
  adapter?: TAdapter;
  options?: ValidatorAdapterOptions<TAdapter>;
}
