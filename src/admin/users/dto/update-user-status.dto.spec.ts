import { validate } from 'class-validator';
import {
  MANAGEABLE_USER_STATUSES,
  type ManageableUserStatus,
  UpdateUserStatusDto,
} from './update-user-status.dto';

describe('UpdateUserStatusDto', () => {
  it('accepts ACTIVE and SUSPENDED statuses', async () => {
    const dto = new UpdateUserStatusDto();
    dto.status = MANAGEABLE_USER_STATUSES.ACTIVE as ManageableUserStatus;

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects PENDING status', async () => {
    const dto = new UpdateUserStatusDto();
    dto.status = 'PENDING' as unknown as ManageableUserStatus;

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
  });
});
