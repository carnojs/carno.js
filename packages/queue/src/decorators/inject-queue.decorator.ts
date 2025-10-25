export function InjectQueue(queueName: string): ParameterDecorator {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    const token = getQueueToken(queueName);
    const existingParams = Reflect.getMetadata('design:paramtypes', target, propertyKey!) || [];
    existingParams[parameterIndex] = token;
    Reflect.defineMetadata('design:paramtypes', existingParams, target, propertyKey!);
  };
}

export function getQueueToken(queueName: string): string {
  return `Queue:${queueName}`;
}
