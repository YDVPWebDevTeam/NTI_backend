jest.mock('./applications.service', () => ({
  ApplicationsService: class ApplicationsService {},
}));

jest.mock('../auth/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: class JwtAuthGuard {},
}));

jest.mock('../auth/guards/roles.guard', () => ({
  RolesGuard: class RolesGuard {},
}));

import { AdminApplicationsController } from './admin-applications.controller';
import { ApplicationsService } from './applications.service';

describe('AdminApplicationsController', () => {
  let controller: AdminApplicationsController;
  let applicationsService: {
    formalVerify: jest.Mock;
    startEvaluation: jest.Mock;
    approve: jest.Mock;
    reject: jest.Mock;
    startOnboarding: jest.Mock;
    activate: jest.Mock;
    pause: jest.Mock;
    complete: jest.Mock;
    archive: jest.Mock;
  };

  beforeEach(() => {
    applicationsService = {
      formalVerify: jest.fn().mockResolvedValue({ id: 'application-1' }),
      startEvaluation: jest.fn().mockResolvedValue({ id: 'application-1' }),
      approve: jest.fn().mockResolvedValue({ id: 'application-1' }),
      reject: jest.fn().mockResolvedValue({ id: 'application-1' }),
      startOnboarding: jest.fn().mockResolvedValue({ id: 'application-1' }),
      activate: jest.fn().mockResolvedValue({ id: 'application-1' }),
      pause: jest.fn().mockResolvedValue({ id: 'application-1' }),
      complete: jest.fn().mockResolvedValue({ id: 'application-1' }),
      archive: jest.fn().mockResolvedValue({ id: 'application-1' }),
    };

    controller = new AdminApplicationsController(
      applicationsService as unknown as ApplicationsService,
    );
  });

  it('delegates formal verification with optional note', async () => {
    const user = { id: 'reviewer-1', role: 'EVALUATOR' } as never;
    const dto = { reason: 'Documents validated' };

    await controller.formalVerify('application-1', user, dto);

    expect(applicationsService.formalVerify).toHaveBeenCalledWith(
      'application-1',
      user,
      'Documents validated',
    );
  });

  it('delegates evaluation start with optional note', async () => {
    const user = { id: 'reviewer-1', role: 'ADMIN' } as never;
    const dto = { reason: 'Committee review started' };

    await controller.startEvaluation('application-1', user, dto);

    expect(applicationsService.startEvaluation).toHaveBeenCalledWith(
      'application-1',
      user,
      'Committee review started',
    );
  });

  it('delegates approval with optional note', async () => {
    const user = { id: 'reviewer-1', role: 'ADMIN' } as never;
    const dto = { reason: 'Strong fit for Program A' };

    await controller.approve('application-1', user, dto);

    expect(applicationsService.approve).toHaveBeenCalledWith(
      'application-1',
      user,
      'Strong fit for Program A',
    );
  });

  it('delegates rejection with required reason', async () => {
    const user = { id: 'reviewer-1', role: 'ADMIN' } as never;
    const dto = { reason: 'Eligibility expectations were not met' };

    await controller.reject('application-1', user, dto);

    expect(applicationsService.reject).toHaveBeenCalledWith(
      'application-1',
      user,
      'Eligibility expectations were not met',
    );
  });

  it('delegates onboarding transition', async () => {
    const user = { id: 'reviewer-1', role: 'EVALUATOR' } as never;

    const result = await controller.startOnboarding('application-1', user);

    expect(applicationsService.startOnboarding).toHaveBeenCalledWith(
      'application-1',
      user,
    );
    expect(result).toEqual({ id: 'application-1' });
  });

  it('delegates activation transition', async () => {
    const user = { id: 'reviewer-1', role: 'ADMIN' } as never;

    await controller.activate('application-1', user);

    expect(applicationsService.activate).toHaveBeenCalledWith(
      'application-1',
      user,
    );
  });

  it('delegates pause transition with reason', async () => {
    const user = { id: 'reviewer-1', role: 'ADMIN' } as never;
    const dto = { reason: 'Waiting for sponsor feedback' };

    await controller.pause('application-1', user, dto);

    expect(applicationsService.pause).toHaveBeenCalledWith(
      'application-1',
      user,
      'Waiting for sponsor feedback',
    );
  });

  it('delegates completion transition', async () => {
    const user = { id: 'reviewer-1', role: 'SUPER_ADMIN' } as never;

    await controller.complete('application-1', user);

    expect(applicationsService.complete).toHaveBeenCalledWith(
      'application-1',
      user,
    );
  });

  it('delegates archive transition with reason', async () => {
    const user = { id: 'reviewer-1', role: 'ADMIN' } as never;
    const dto = { reason: 'Retention period elapsed' };

    await controller.archive('application-1', user, dto);

    expect(applicationsService.archive).toHaveBeenCalledWith(
      'application-1',
      user,
      'Retention period elapsed',
    );
  });
});
