import { isClassValidator } from './isClassValidator';

const cache = new Map<Function, boolean>();

export function isValidatable(token: Function): boolean {
  let result = cache.get(token);

  if (result === undefined) {
    result = isClassValidator(token);
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
