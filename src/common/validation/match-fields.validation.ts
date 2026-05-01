import {
  ValidationArguments,
  ValidationOptions,
  registerDecorator,
} from 'class-validator';

export function MatchFields(
  property: string,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    const propertyKey = propertyName as string;

    registerDecorator({
      target: object.constructor,
      propertyName: propertyKey,
      options: validationOptions,
      constraints: [property],
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const currentValue = value as string;
          const relatedPropertyName = args.constraints[0] as string;
          const obj = args.object as Record<string, unknown>;
          const relatedValue = obj[relatedPropertyName];

          if (
            typeof currentValue !== 'string' ||
            typeof relatedValue !== 'string'
          ) {
            return false;
          }

          return currentValue === relatedValue;
        },

        defaultMessage(args: ValidationArguments) {
          const relatedProperty = args.constraints[0] as string;
          return `${args.property} must match ${relatedProperty}`;
        },
      },
    });
  };
}
