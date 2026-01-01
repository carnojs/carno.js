export function getDefaultLength(type: string): number {
  return null;
}

const snakeCaseCache = new Map<string, string>();

export function toSnakeCase(str: string): string {
  let cached = snakeCaseCache.get(str);

  if (cached) {
    return cached;
  }

  cached = str[0].toLowerCase() + str.slice(1).replace(/([A-Z])/g, '_$1').toLowerCase();
  snakeCaseCache.set(str, cached);

  return cached;
}

export function extendsFrom(baseClass, instance) {
  if (!instance) return false;
  let proto = Object.getPrototypeOf(instance);
  while (proto) {
    if (proto === baseClass.prototype) {
      return true;
    }
    proto = Object.getPrototypeOf(proto);
  }
  return false;
}
