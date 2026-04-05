import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTeamInvitesDto } from './create-team-invites.dto';

describe('CreateTeamInvitesDto', () => {
  it('accepts at least two valid emails', async () => {
    const dto = plainToInstance(CreateTeamInvitesDto, {
      emails: ['a@example.com', 'b@example.com'],
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects arrays with fewer than two emails', async () => {
    const dto = plainToInstance(CreateTeamInvitesDto, {
      emails: ['a@example.com'],
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.constraints).toHaveProperty('arrayMinSize');
  });

  it('rejects invalid email items', async () => {
    const dto = plainToInstance(CreateTeamInvitesDto, {
      emails: ['a@example.com', 'invalid-email'],
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.constraints).toHaveProperty('isEmail');
  });
});
