jest.mock('./applications.service', () => ({
  ApplicationsService: class ApplicationsService {},
}));

jest.mock('./application-sections.service', () => ({
  ApplicationSectionsService: class ApplicationSectionsService {},
}));

jest.mock('../auth/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: class JwtAuthGuard {},
}));

import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { ApplicationSectionsService } from './application-sections.service';

describe('ApplicationsController', () => {
  let controller: ApplicationsController;
  let applicationsService: {
    createDraft: jest.Mock;
    findById: jest.Mock;
    attachDocument: jest.Mock;
    getDocumentCompleteness: jest.Mock;
    submit: jest.Mock;
  };
  let sectionsService: {
    listSections: jest.Mock;
    upsertSection: jest.Mock;
    getSectionHistory: jest.Mock;
    setActiveVersion: jest.Mock;
  };

  beforeEach(() => {
    applicationsService = {
      createDraft: jest.fn().mockResolvedValue({ id: 'application-1' }),
      findById: jest.fn().mockResolvedValue({ id: 'application-1' }),
      attachDocument: jest.fn().mockResolvedValue({ id: 'document-1' }),
      getDocumentCompleteness: jest.fn().mockResolvedValue({
        applicationId: 'application-1',
        isComplete: true,
      }),
      submit: jest.fn().mockResolvedValue({ id: 'application-1' }),
    };

    sectionsService = {
      listSections: jest.fn().mockResolvedValue([]),
      upsertSection: jest.fn().mockResolvedValue({ id: 'section-1' }),
      getSectionHistory: jest.fn().mockResolvedValue([]),
      setActiveVersion: jest.fn().mockResolvedValue({ id: 'section-1' }),
    };

    controller = new ApplicationsController(
      applicationsService as unknown as ApplicationsService,
      sectionsService as unknown as ApplicationSectionsService,
    );
  });

  it('delegates draft creation to the applications service', async () => {
    const user = { id: 'user-1', email: 'lead@example.com' } as never;
    const dto = {
      callId: '87dcb0e9-2f7e-4ab5-b014-d2f1204bc138',
      teamId: '5db65d84-f9ae-4221-a4be-15e65e6d4d3c',
    };

    const result = await controller.createDraft(user, dto);

    expect(applicationsService.createDraft).toHaveBeenCalledWith(user, dto);
    expect(result).toEqual({ id: 'application-1' });
  });

  it('delegates lookup to the applications service with user context', async () => {
    const user = { id: 'user-1', email: 'user@example.com' } as never;
    const result = await controller.findById(
      'f6c90688-c973-40ca-8f3b-c55667cc6f77',
      user,
    );

    expect(applicationsService.findById).toHaveBeenCalledWith(
      'f6c90688-c973-40ca-8f3b-c55667cc6f77',
      user,
    );
    expect(result).toEqual({ id: 'application-1' });
  });

  it('delegates document attachment', async () => {
    const user = { id: 'user-1', email: 'lead@example.com' } as never;
    const dto = { fileId: 'file-1', documentType: 'BUDGET' } as never;

    const result = await controller.attachDocument('application-1', user, dto);

    expect(applicationsService.attachDocument).toHaveBeenCalledWith(
      'application-1',
      user,
      dto,
    );
    expect(result).toEqual({ id: 'document-1' });
  });

  it('delegates completeness lookup', async () => {
    const user = { id: 'user-1', email: 'lead@example.com' } as never;

    const result = await controller.getDocumentCompleteness(
      'application-1',
      user,
    );

    expect(applicationsService.getDocumentCompleteness).toHaveBeenCalledWith(
      'application-1',
      user,
    );
    expect(result).toEqual({
      applicationId: 'application-1',
      isComplete: true,
    });
  });

  it('delegates submission', async () => {
    const user = { id: 'user-1', email: 'lead@example.com' } as never;

    const result = await controller.submit('application-1', user);

    expect(applicationsService.submit).toHaveBeenCalledWith(
      'application-1',
      user,
    );
    expect(result).toEqual({ id: 'application-1' });
  });

  it('delegates section listing to the sections service', async () => {
    const user = { id: 'user-1', email: 'member@example.com' } as never;

    const result = await controller.listSections('application-1', user);

    expect(sectionsService.listSections).toHaveBeenCalledWith(
      'application-1',
      user,
    );
    expect(result).toEqual([]);
  });

  it('delegates section upsert to the sections service', async () => {
    const user = { id: 'user-1', email: 'lead@example.com' } as never;
    const dto = { valueJson: { firstName: 'Jane' } } as never;

    const result = await controller.upsertSection(
      'application-1',
      'profile',
      dto,
      user,
    );

    expect(sectionsService.upsertSection).toHaveBeenCalledWith(
      'application-1',
      'profile',
      dto,
      user,
    );
    expect(result).toEqual({ id: 'section-1' });
  });

  it('delegates section history lookup to the sections service', async () => {
    const user = { id: 'admin-1', email: 'admin@example.com' } as never;

    const result = await controller.getSectionHistory(
      'application-1',
      'profile',
      user,
    );

    expect(sectionsService.getSectionHistory).toHaveBeenCalledWith(
      'application-1',
      'profile',
      user,
    );
    expect(result).toEqual([]);
  });

  it('delegates active version updates to the sections service', async () => {
    const user = { id: 'admin-1', email: 'admin@example.com' } as never;
    const dto = { version: 2 } as never;

    const result = await controller.setActiveVersion(
      'application-1',
      'profile',
      dto,
      user,
    );

    expect(sectionsService.setActiveVersion).toHaveBeenCalledWith(
      'application-1',
      'profile',
      dto,
      user,
    );
    expect(result).toEqual({ id: 'section-1' });
  });
});
