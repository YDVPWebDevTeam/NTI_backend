jest.mock(
  'generated/prisma/enums',
  () => ({
    ApplicationStatus: {
      DRAFT: 'DRAFT',
      ACTIVE_PROJECT: 'ACTIVE_PROJECT',
      ARCHIVED: 'ARCHIVED',
    },
    ConversationChannel: {
      INTERNAL: 'INTERNAL',
      PARTICIPANTS: 'PARTICIPANTS',
    },
    ProgramBProjectStatus: {
      ACTIVE: 'ACTIVE',
      CLOSED: 'CLOSED',
    },
    ProgramType: {
      PROGRAM_A: 'PROGRAM_A',
      PROGRAM_B: 'PROGRAM_B',
    },
    UserRole: {
      STUDENT: 'STUDENT',
      ADMIN: 'ADMIN',
      COMPANY_OWNER: 'COMPANY_OWNER',
      COMPANY_EMPLOYEE: 'COMPANY_EMPLOYEE',
      MENTOR: 'MENTOR',
      EVALUATOR: 'EVALUATOR',
      SUPER_ADMIN: 'SUPER_ADMIN',
    },
    UserStatus: {
      PENDING: 'PENDING',
      ACTIVE: 'ACTIVE',
      SUSPENDED: 'SUSPENDED',
    },
  }),
  { virtual: true },
);

import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConversationAccessService } from './conversation-access.service';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import type {
  ApplicationAnchorView,
  ProgramBProjectAnchorView,
} from './conversations.repository';

const CHANNEL = { INTERNAL: 'INTERNAL', PARTICIPANTS: 'PARTICIPANTS' } as const;

type UserCtx = {
  id: string;
  email: string;
  role: string;
  status: string;
  organizationId: string | null;
};

function user(overrides: Partial<UserCtx>): AuthenticatedUserContext {
  return {
    id: 'user-1',
    email: 'user@example.com',
    role: 'STUDENT',
    status: 'ACTIVE',
    organizationId: null,
    ...overrides,
  } as unknown as AuthenticatedUserContext;
}

function project(
  overrides: Partial<ProgramBProjectAnchorView> = {},
): ProgramBProjectAnchorView {
  return {
    id: 'project-1',
    status: 'ACTIVE',
    mentorUserId: 'mentor-1',
    productOwnerUserId: 'po-1',
    teamId: 'team-1',
    backlogItem: { organizationId: 'org-1' },
    team: {
      leaderId: 'leader-1',
      members: [{ userId: 'student-1' }, { userId: 'leader-1' }],
    },
    ...overrides,
  } as ProgramBProjectAnchorView;
}

function application(
  overrides: Partial<ApplicationAnchorView> = {},
): ApplicationAnchorView {
  return {
    id: 'app-1',
    status: 'ACTIVE_PROJECT',
    mentorUserId: 'mentor-1',
    call: { type: 'PROGRAM_A' },
    team: {
      leaderId: 'leader-1',
      members: [{ userId: 'student-1' }, { userId: 'leader-1' }],
    },
    ...overrides,
  } as ApplicationAnchorView;
}

describe('ConversationAccessService', () => {
  let service: ConversationAccessService;

  beforeEach(() => {
    service = new ConversationAccessService();
  });

  describe('Program B INTERNAL channel', () => {
    it('is hidden (404) from a same-org company user', () => {
      const companyUser = user({
        id: 'company-1',
        role: 'COMPANY_OWNER',
        organizationId: 'org-1',
      });

      expect(() =>
        service.assertProgramBChannelReadable(
          project(),
          CHANNEL.INTERNAL,
          companyUser,
        ),
      ).toThrow(NotFoundException);
    });

    it('is hidden (404) even from the product owner (company side)', () => {
      const po = user({
        id: 'po-1',
        role: 'COMPANY_EMPLOYEE',
        organizationId: 'org-1',
      });

      expect(() =>
        service.assertProgramBChannelReadable(project(), CHANNEL.INTERNAL, po),
      ).toThrow(NotFoundException);
    });

    it('is readable by a team member', () => {
      expect(() =>
        service.assertProgramBChannelReadable(
          project(),
          CHANNEL.INTERNAL,
          user({ id: 'student-1' }),
        ),
      ).not.toThrow();
    });

    it('is readable by the assigned mentor', () => {
      expect(() =>
        service.assertProgramBChannelReadable(
          project(),
          CHANNEL.INTERNAL,
          user({ id: 'mentor-1', role: 'MENTOR' }),
        ),
      ).not.toThrow();
    });

    it('is NOT readable by an unassigned mentor', () => {
      expect(() =>
        service.assertProgramBChannelReadable(
          project(),
          CHANNEL.INTERNAL,
          user({ id: 'mentor-2', role: 'MENTOR' }),
        ),
      ).toThrow(ForbiddenException);
    });

    it('is readable by reviewers/admins', () => {
      expect(() =>
        service.assertProgramBChannelReadable(
          project(),
          CHANNEL.INTERNAL,
          user({ id: 'admin-1', role: 'ADMIN' }),
        ),
      ).not.toThrow();
    });
  });

  describe('Program B PARTICIPANTS channel', () => {
    it('is readable by a same-org company user', () => {
      expect(() =>
        service.assertProgramBChannelReadable(
          project(),
          CHANNEL.PARTICIPANTS,
          user({
            id: 'company-1',
            role: 'COMPANY_OWNER',
            organizationId: 'org-1',
          }),
        ),
      ).not.toThrow();
    });

    it('is forbidden (403) for a company user from a different org', () => {
      expect(() =>
        service.assertProgramBChannelReadable(
          project(),
          CHANNEL.PARTICIPANTS,
          user({
            id: 'company-x',
            role: 'COMPANY_OWNER',
            organizationId: 'org-other',
          }),
        ),
      ).toThrow(ForbiddenException);
    });

    it('is readable by team members and mentor too', () => {
      expect(() =>
        service.assertProgramBChannelReadable(
          project(),
          CHANNEL.PARTICIPANTS,
          user({ id: 'student-1' }),
        ),
      ).not.toThrow();
    });

    it('is forbidden (403) for an unrelated student', () => {
      expect(() =>
        service.assertProgramBChannelReadable(
          project(),
          CHANNEL.PARTICIPANTS,
          user({ id: 'stranger' }),
        ),
      ).toThrow(ForbiddenException);
    });
  });

  describe('write gating', () => {
    it('blocks writes to a CLOSED project for non-admins (409)', () => {
      expect(() =>
        service.assertProgramBChannelWritable(
          project({ status: 'CLOSED' }),
          CHANNEL.INTERNAL,
          user({ id: 'student-1' }),
        ),
      ).toThrow(ConflictException);
    });

    it('allows admins to write to a CLOSED project', () => {
      expect(() =>
        service.assertProgramBChannelWritable(
          project({ status: 'CLOSED' }),
          CHANNEL.INTERNAL,
          user({ id: 'admin-1', role: 'ADMIN' }),
        ),
      ).not.toThrow();
    });

    it('blocks writes to an ARCHIVED Program A application for non-admins (409)', () => {
      expect(() =>
        service.assertProgramAChannelWritable(
          application({ status: 'ARCHIVED' }),
          CHANNEL.INTERNAL,
          user({ id: 'student-1' }),
        ),
      ).toThrow(ConflictException);
    });
  });

  describe('inactive users', () => {
    it('are always forbidden', () => {
      expect(() =>
        service.assertProgramBChannelReadable(
          project(),
          CHANNEL.PARTICIPANTS,
          user({ id: 'student-1', status: 'SUSPENDED' }),
        ),
      ).toThrow(ForbiddenException);
    });
  });

  describe('Program A application', () => {
    it('exposes only INTERNAL — PARTICIPANTS yields 404', () => {
      expect(() =>
        service.assertProgramAChannelReadable(
          application(),
          CHANNEL.PARTICIPANTS,
          user({ id: 'student-1' }),
        ),
      ).toThrow(NotFoundException);
    });

    it('allows the team and mentor on INTERNAL', () => {
      expect(() =>
        service.assertProgramAChannelReadable(
          application(),
          CHANNEL.INTERNAL,
          user({ id: 'mentor-1', role: 'MENTOR' }),
        ),
      ).not.toThrow();
      expect(() =>
        service.assertProgramAChannelReadable(
          application(),
          CHANNEL.INTERNAL,
          user({ id: 'student-1' }),
        ),
      ).not.toThrow();
    });

    it('404s when the anchor is not actually a Program A application', () => {
      expect(() =>
        service.assertProgramAChannelReadable(
          application({
            call: { type: 'PROGRAM_B' },
          } as Partial<ApplicationAnchorView>),
          CHANNEL.INTERNAL,
          user({ id: 'student-1' }),
        ),
      ).toThrow(NotFoundException);
    });
  });

  describe('listReadable*Channels', () => {
    it('returns both channels for a team member on Program B', () => {
      expect(
        service.listReadableProgramBChannels(
          project(),
          user({ id: 'student-1' }),
        ),
      ).toEqual(['PARTICIPANTS', 'INTERNAL']);
    });

    it('returns only PARTICIPANTS for a company user', () => {
      expect(
        service.listReadableProgramBChannels(
          project(),
          user({
            id: 'company-1',
            role: 'COMPANY_OWNER',
            organizationId: 'org-1',
          }),
        ),
      ).toEqual(['PARTICIPANTS']);
    });
  });
});
