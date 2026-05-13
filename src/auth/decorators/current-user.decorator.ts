import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';

export const CurrentUser = createParamDecorator<
  unknown,
  AuthenticatedUserContext
>((_data: unknown, executionContext: ExecutionContext) => {
  const request = executionContext
    .switchToHttp()
    .getRequest<{ user: AuthenticatedUserContext }>();
  return request.user;
});
