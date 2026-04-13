import { applyDecorators } from '@nestjs/common';
import { Transform, type TransformFnParams } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEmail,
  type ValidationOptions,
} from 'class-validator';

export const normalizeEmail = (email: string): string =>
  email.trim().toLowerCase();

type EmailValidationOptions = Omit<ValidationOptions, 'each'> & {
  array?: boolean;
  normalize?: boolean;
  unique?: boolean;
  ensureArray?: boolean;
};

export function EmailValidation(
  options?: EmailValidationOptions,
): PropertyDecorator {
  const {
    array = false,
    normalize = true,
    unique = false,
    ensureArray = array,
    ...validationOptions
  } = options ?? {};

  const decorators: PropertyDecorator[] = [];

  if (ensureArray) {
    decorators.push(IsArray());
  }

  if (normalize) {
    decorators.push(
      Transform(({ value }: TransformFnParams) => {
        const rawValue: unknown = value;

        if (array && Array.isArray(rawValue)) {
          return rawValue.map((email): unknown =>
            typeof email === 'string' ? normalizeEmail(email) : email,
          );
        }

        if (typeof rawValue === 'string') {
          return normalizeEmail(rawValue);
        }

        return rawValue;
      }),
    );
  }

  if (array && unique) {
    decorators.push(ArrayUnique(normalizeEmail));
  }

  decorators.push(
    IsEmail(
      {},
      array ? { ...validationOptions, each: true } : validationOptions,
    ),
  );

  return applyDecorators(...decorators);
}
