import { validate } from 'class-validator';
import {
  MANAGEABLE_ORG_STATUSES,
  UpdateOrgStatusDto,
} from './update-org-status.dto';

describe('UpdateOrgStatusDto', () => {
  it('accepts ACTIVE without rejectionReason', async () => {
    const dto = new UpdateOrgStatusDto();
    dto.status = MANAGEABLE_ORG_STATUSES.ACTIVE;

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('accepts REJECTED with rejectionReason', async () => {
    const dto = new UpdateOrgStatusDto();
    dto.status = MANAGEABLE_ORG_STATUSES.REJECTED;
    dto.rejectionReason = 'Insufficient business documentation';

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects REJECTED without rejectionReason', async () => {
    const dto = new UpdateOrgStatusDto();
    dto.status = MANAGEABLE_ORG_STATUSES.REJECTED;

    const errors = await validate(dto);

    expect(errors).not.toHaveLength(0);
    expect(errors[0].property).toBe('rejectionReason');
  });

  it('rejects unsupported status values', async () => {
    const dto = new UpdateOrgStatusDto();
    dto.status = 'PENDING' as never;

    const errors = await validate(dto);

    expect(errors).not.toHaveLength(0);
    expect(errors[0].property).toBe('status');
  });
});
