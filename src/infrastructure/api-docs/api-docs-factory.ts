import { applyDecorators, Type } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';

type Decorator = MethodDecorator & ClassDecorator & PropertyDecorator;

type ApiDecoratorConfig = {
  summary: string;
  description?: string;
  body?:
    | Type<unknown>
    | {
        type: Type<unknown>;
        description?: string;
        examples?: Record<
          string,
          {
            summary?: string;
            description?: string;
            value: unknown;
          }
        >;
      };
  successResponse?: {
    status: number;
    type?: Type<unknown>;
    description?: string;
    examples?: Record<
      string,
      {
        summary?: string;
        description?: string;
        value: unknown;
      }
    >;
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
    ...(config.body
      ? [
          ApiBody(
            'type' in config.body
              ? {
                  type: config.body.type,
                  description: config.body.description,
                  examples: config.body.examples,
                }
              : { type: config.body },
          ),
        ]
      : []),
    ...(config.successResponse
      ? [
          ApiResponse({
            status: config.successResponse.status,
            type: config.successResponse.type,
            description: config.successResponse.description,
            ...(config.successResponse.examples
              ? {
                  content: {
                    'application/json': {
                      examples: config.successResponse.examples,
                    },
                  },
                }
              : {}),
          }),
        ]
      : []),
    ...(config.extraDecorators ?? []),
    ...(config.errors ?? []),
  );
}
