import { applyDecorators, Type } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';

type Decorator = MethodDecorator & ClassDecorator & PropertyDecorator;

type ApiDecoratorConfig = {
  summary: string;
  description?: string;
  body?: Type<unknown>;
  successResponse?: {
    status: number;
    type?: Type<unknown>;
    description?: string;
  };
  errors?: Decorator[];
  extraDecorators?: Decorator[];
};

export function createApiDecorator(
  config: ApiDecoratorConfig,
): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: config.summary,
      description: config.description,
    }),
    ...(config.body ? [ApiBody({ type: config.body })] : []),
    ...(config.successResponse
      ? [
          ApiResponse({
            status: config.successResponse.status,
            type: config.successResponse.type,
            description: config.successResponse.description,
          }),
        ]
      : []),
    ...(config.extraDecorators ?? []),
    ...(config.errors ?? []),
  );
}
