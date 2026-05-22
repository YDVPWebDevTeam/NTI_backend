jest.mock('./account.service', () => ({
  AccountService: class AccountService {},
}));

import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { ACCOUNT_MESSAGES } from './account.messages';

describe('AccountController', () => {
  let controller: AccountController;
  let accountService: {
    changePassword: jest.Mock;
    requestEmailChange: jest.Mock;
    confirmEmailChange: jest.Mock;
  };

  const authUser = {
    id: 'user-1',
    email: 'student@example.com',
    role: 'STUDENT',
    status: 'ACTIVE',
    organizationId: null,
  } as AuthenticatedUserContext;

  beforeEach(() => {
    accountService = {
      changePassword: jest.fn(),
      requestEmailChange: jest.fn(),
      confirmEmailChange: jest.fn(),
    };

    controller = new AccountController(
      accountService as unknown as AccountService,
    );
  });

  it('delegates password change to the service', async () => {
    accountService.changePassword.mockResolvedValue({
      message: ACCOUNT_MESSAGES.PASSWORD_CHANGED,
    });

    const result = await controller.changePassword(authUser, {
      currentPassword: 'CurrentPass123',
      newPassword: 'NewStrongPass123',
      confirmNewPassword: 'NewStrongPass123',
    });

    expect(accountService.changePassword).toHaveBeenCalledWith(
      authUser,
      'CurrentPass123',
      'NewStrongPass123',
    );
    expect(result).toEqual({ message: ACCOUNT_MESSAGES.PASSWORD_CHANGED });
  });

  it('delegates email change request to the service', async () => {
    accountService.requestEmailChange.mockResolvedValue({
      message: ACCOUNT_MESSAGES.EMAIL_CHANGE_REQUESTED,
    });

    const result = await controller.requestEmailChange(authUser, {
      newEmail: 'new@example.com',
    });

    expect(accountService.requestEmailChange).toHaveBeenCalledWith(
      authUser,
      'new@example.com',
    );
    expect(result).toEqual({
      message: ACCOUNT_MESSAGES.EMAIL_CHANGE_REQUESTED,
    });
  });

  it('delegates email change confirmation to the service', async () => {
    accountService.confirmEmailChange.mockResolvedValue({
      message: ACCOUNT_MESSAGES.EMAIL_CHANGED,
    });

    const result = await controller.confirmEmailChange(authUser, {
      token: 'token-123',
    });

    expect(accountService.confirmEmailChange).toHaveBeenCalledWith(
      authUser,
      'token-123',
    );
    expect(result).toEqual({ message: ACCOUNT_MESSAGES.EMAIL_CHANGED });
  });
});
