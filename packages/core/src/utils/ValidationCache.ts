import type { ValidatorAdapter } from '../validation/ValidatorAdapter';

let currentAdapter: ValidatorAdapter | null = null;
const cache = new Map<Function, boolean>();

export function setValidatorAdapter(adapter: ValidatorAdapter): void {
  currentAdapter = adapter;
  cache.clear();
}

export function isValidatable(token: Function): boolean {
  if (!currentAdapter) {
    throw new Error(
      'Validator adapter not initialized. Call setValidatorAdapter() first.'
    );
  }

  let result = cache.get(token);

  if (result === undefined) {
    result = currentAdapter.hasValidation(token);
    cache.set(token, result);
  }

  return result;
}

export function preloadValidationForParams(args: any[]): number[] {
  const indices: number[] = [];

  for (let i = 0; i < args.length; i++) {
    if (typeof args[i] === 'function' && isValidatable(args[i])) {
      indices.push(i);
    }
  }

  return indices;
}

export function clearValidationCache(): void {
  cache.clear();
}
