const queueTokens = new Map<string, new () => any>();

export function InjectQueue(queueName: string): ParameterDecorator {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    const token = getQueueToken(queueName);
    const existingParams = Reflect.getMetadata('design:paramtypes', target, propertyKey!) || [];
    existingParams[parameterIndex] = token;
    Reflect.defineMetadata('design:paramtypes', existingParams, target, propertyKey!);
  };
}

export function getQueueToken(queueName: string): new () => any {
  if (!queueTokens.has(queueName)) {
    // Create a named class dynamically to serve as token
    const TokenClass = class QueueToken {};
    Object.defineProperty(TokenClass, 'name', { value: `Queue_${queueName}` });
    queueTokens.set(queueName, TokenClass);
  }
  return queueTokens.get(queueName)!;
}
