jest.mock('./applications.repository', () => ({
  ApplicationsRepository: class ApplicationsRepository {},
}));

jest.mock('./eligibility-signals.repository', () => ({
  EligibilitySignalsRepository: class EligibilitySignalsRepository {},
}));

import { EligibilitySignalsService } from './eligibility-signals.service';
import { ApplicationsRepository } from './applications.repository';
import { EligibilitySignalsRepository } from './eligibility-signals.repository';

describe('EligibilitySignalsService', () => {
  let service: EligibilitySignalsService;
  let applicationsRepository: {
    findByIdForEligibility: jest.Mock;
  };
  let eligibilitySignalsRepository: {
    getRuleConfigs: jest.Mock;
    findSignalsByApplicationId: jest.Mock;
    upsertSignal: jest.Mock;
  };

  const application = {
    id: 'application-1',
    callId: 'call-1',
    teamId: 'team-1',
    team: {
      id: 'team-1',
      leaderId: 'user-1',
      members: [
        {
          userId: 'user-1',
          user: {
            id: 'user-1',
            email: 'lead@example.com',
            studentProfile: {
              academicDeclarationAcceptedAt: new Date(
                '2026-05-01T00:00:00.000Z',
              ),
              academicEvidenceFileId: 'file-1',
              hasTransferredSubjects: false,
              transferredSubjectsCount: null,
              profileSubjectsAverage: 1.8,
            },
          },
        },
        {
          userId: 'user-2',
          user: {
            id: 'user-2',
            email: 'member@example.com',
            studentProfile: {
              academicDeclarationAcceptedAt: new Date(
                '2026-05-01T00:00:00.000Z',
              ),
              academicEvidenceFileId: 'file-2',
              hasTransferredSubjects: false,
              transferredSubjectsCount: null,
              profileSubjectsAverage: 1.9,
            },
          },
        },
      ],
    },
  };

  beforeEach(() => {
    applicationsRepository = {
      findByIdForEligibility: jest.fn().mockResolvedValue(application),
    };

    eligibilitySignalsRepository = {
      getRuleConfigs: jest.fn().mockResolvedValue([]),
      findSignalsByApplicationId: jest.fn().mockResolvedValue([]),
      upsertSignal: jest.fn().mockResolvedValue(undefined),
    };

    service = new EligibilitySignalsService(
      applicationsRepository as unknown as ApplicationsRepository,
      eligibilitySignalsRepository as unknown as EligibilitySignalsRepository,
    );
  });

  it('uses default minimum team size of 3', async () => {
    await service.recomputeForApplication('application-1');

    expect(eligibilitySignalsRepository.upsertSignal).toHaveBeenCalledWith(
      'application-1',
      'TEAM_SIZE_MIN',
      false,
      'Team has 2 member(s), required minimum is 3.',
      undefined,
    );
  });

  it('uses configured team size override', async () => {
    eligibilitySignalsRepository.getRuleConfigs.mockResolvedValue([
      { code: 'TEAM_SIZE_MIN', threshold: '2' },
    ]);

    await service.recomputeForApplication('application-1');

    expect(eligibilitySignalsRepository.upsertSignal).toHaveBeenCalledWith(
      'application-1',
      'TEAM_SIZE_MIN',
      true,
      null,
      undefined,
    );
  });

  it('fails transferred subjects signal when configured maximum is exceeded', async () => {
    applicationsRepository.findByIdForEligibility.mockResolvedValue({
      ...application,
      team: {
        ...application.team,
        members: [
          application.team.members[0],
          {
            ...application.team.members[1],
            user: {
              ...application.team.members[1].user,
              studentProfile: {
                ...application.team.members[1].user.studentProfile,
                hasTransferredSubjects: true,
                transferredSubjectsCount: 2,
              },
            },
          },
        ],
      },
    });
    eligibilitySignalsRepository.getRuleConfigs.mockResolvedValue([
      { code: 'TEAM_SIZE_MIN', threshold: '2' },
      { code: 'TRANSFERRED_SUBJECTS_MAX', threshold: '0' },
    ]);

    await service.recomputeForApplication('application-1');

    expect(eligibilitySignalsRepository.upsertSignal).toHaveBeenCalledWith(
      'application-1',
      'TRANSFERRED_SUBJECTS_MAX',
      false,
      'Transferred subjects exceed the recommended maximum for member(s): member@example.com.',
      undefined,
    );
  });

  it('fails profile-subject average signal when configured maximum is exceeded', async () => {
    applicationsRepository.findByIdForEligibility.mockResolvedValue({
      ...application,
      team: {
        ...application.team,
        members: [
          application.team.members[0],
          {
            ...application.team.members[1],
            user: {
              ...application.team.members[1].user,
              studentProfile: {
                ...application.team.members[1].user.studentProfile,
                profileSubjectsAverage: 2.7,
              },
            },
          },
        ],
      },
    });
    eligibilitySignalsRepository.getRuleConfigs.mockResolvedValue([
      { code: 'TEAM_SIZE_MIN', threshold: '2' },
      { code: 'PROFILE_SUBJECTS_AVERAGE_MAX', threshold: '2' },
    ]);

    await service.recomputeForApplication('application-1');

    expect(eligibilitySignalsRepository.upsertSignal).toHaveBeenCalledWith(
      'application-1',
      'PROFILE_SUBJECTS_AVERAGE_MAX',
      false,
      'Profile-subject average exceeds the recommended maximum for member(s): member@example.com.',
      undefined,
    );
  });
});
