import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ApplicationStatus, UserRole } from '../../../generated/prisma/enums';
import { ApplicationSectionsRulesService } from './application-sections-rules.service';

describe('ApplicationSectionsRulesService', () => {
  let service: ApplicationSectionsRulesService;

  const application = {
    team: {
      leaderId: 'user-1',
      members: [{ userId: 'user-1' }, { userId: 'user-2' }],
    },
  } as never;

  beforeEach(() => {
    service = new ApplicationSectionsRulesService();
  });

  it('assertApplicationIsDraft allows draft applications', () => {
    expect(() =>
      service.assertApplicationIsDraft(ApplicationStatus.DRAFT),
    ).not.toThrow();
  });

  it('assertApplicationIsDraft rejects non-draft applications', () => {
    expect(() =>
      service.assertApplicationIsDraft(ApplicationStatus.SUBMITTED),
    ).toThrow(BadRequestException);
  });

  it('assertReadAccess allows team members and admins', () => {
    expect(() =>
      service.assertReadAccess(application, {
        id: 'user-2',
        email: 'member@example.com',
        role: UserRole.STUDENT,
      } as never),
    ).not.toThrow();

    expect(() =>
      service.assertReadAccess(application, {
        id: 'admin-1',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      } as never),
    ).not.toThrow();
  });

  it('assertReadAccess rejects outsiders', () => {
    expect(() =>
      service.assertReadAccess(application, {
        id: 'user-3',
        email: 'outsider@example.com',
        role: UserRole.STUDENT,
      } as never),
    ).toThrow(ForbiddenException);
  });

  it('assertWriteAccess allows team lead only', () => {
    expect(() =>
      service.assertWriteAccess(application, {
        id: 'user-1',
        email: 'lead@example.com',
        role: UserRole.STUDENT,
      } as never),
    ).not.toThrow();
  });

  it('assertWriteAccess rejects non-leads', () => {
    expect(() =>
      service.assertWriteAccess(application, {
        id: 'user-2',
        email: 'member@example.com',
        role: UserRole.STUDENT,
      } as never),
    ).toThrow(ForbiddenException);
  });

  it('assertAdminAccess allows admins only', () => {
    expect(() =>
      service.assertAdminAccess({
        id: 'admin-1',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      } as never),
    ).not.toThrow();
  });

  it('assertAdminAccess rejects non-admins', () => {
    expect(() =>
      service.assertAdminAccess({
        id: 'user-1',
        email: 'lead@example.com',
        role: UserRole.STUDENT,
      } as never),
    ).toThrow(ForbiddenException);
  });
});
