/**
 * Utility class for handling metadata operations.
 * Wraps Reflect.getMetadata and Reflect.defineMetadata.
 */
export class Metadata {
  static get<T = any>(key: string | symbol, target: any): T | undefined {
    return Reflect.getMetadata(key, target);
  }

  static set(key: string | symbol, value: any, target: any): void {
    Reflect.defineMetadata(key, value, target);
  }

  static has(key: string | symbol, target: any): boolean {
    return Reflect.hasMetadata(key, target);
  }

  static delete(key: string | symbol, target: any): boolean {
    return Reflect.deleteMetadata(key, target);
  }

  static keys(target: any): (string | symbol)[] {
    return Reflect.getMetadataKeys(target);
  }

  static getType(target: any, propertyKey: string | symbol): any {
    return Reflect.getMetadata('design:type', target, propertyKey);
  }
}

/**
 * Type guard for checking if value is an object.
 */
export function isObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard for checking if value is a string.
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}
