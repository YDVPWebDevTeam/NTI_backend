import { applyDecorators } from '@nestjs/common';
import {
  IsString,
  IsStrongPassword,
  MaxLength,
  MinLength,
} from 'class-validator';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_WEAK_MESSAGE =
  'Password must contain at least one letter and one number';
export const PASSWORD_STRONG_OPTIONS = {
  minLength: PASSWORD_MIN_LENGTH,
  minLowercase: 1,
  minUppercase: 0,
  minNumbers: 1,
  minSymbols: 0,
} as const;

export function PasswordValidation(): PropertyDecorator {
  return applyDecorators(
    IsString(),
    MinLength(PASSWORD_MIN_LENGTH),
    MaxLength(PASSWORD_MAX_LENGTH),
    IsStrongPassword(PASSWORD_STRONG_OPTIONS, {
      message: PASSWORD_WEAK_MESSAGE,
    }),
  );
}
