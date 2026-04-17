import { validate } from 'class-validator';
import {
  CreateSystemInviteDto,
  SYSTEM_INVITABLE_ROLES,
} from './create-system-invite.dto';

describe('CreateSystemInviteDto', () => {
  it('accepts valid payload', async () => {
    const dto = new CreateSystemInviteDto();
    dto.email = 'mentor@example.com';
    dto.roleToAssign = SYSTEM_INVITABLE_ROLES.MENTOR;

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects invalid email', async () => {
    const dto = new CreateSystemInviteDto();
    dto.email = 'invalid-email';
    dto.roleToAssign = SYSTEM_INVITABLE_ROLES.EVALUATOR;

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
  });

  it('rejects unsupported role value', async () => {
    const dto = new CreateSystemInviteDto();
    dto.email = 'mentor@example.com';
    dto.roleToAssign = 'SUPER_ADMIN' as never;

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
  });
});
