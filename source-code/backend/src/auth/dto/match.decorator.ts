import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export function Match(property: string, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'Match',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const relatedProperty = args.constraints[0] as string | undefined;
          if (!relatedProperty) return false;

          const relatedObject = args.object as Record<string, unknown>;
          return value === relatedObject[relatedProperty];
        },
      },
    });
  };
}
