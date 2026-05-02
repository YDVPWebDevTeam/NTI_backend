jest.mock('./applications.service', () => ({
  ApplicationsService: class ApplicationsService {},
}));

jest.mock('../auth/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: class JwtAuthGuard {},
}));

import { CallsDocumentsController } from './calls-documents.controller';
import { ApplicationsService } from './applications.service';

describe('CallsDocumentsController', () => {
  it('delegates required document lookup to the applications service', async () => {
    const applicationsService = {
      getRequiredDocumentsForCall: jest
        .fn()
        .mockResolvedValue({ callId: 'call-1' }),
    };

    const controller = new CallsDocumentsController(
      applicationsService as unknown as ApplicationsService,
    );

    await expect(controller.getRequiredDocuments('call-1')).resolves.toEqual({
      callId: 'call-1',
    });
    expect(
      applicationsService.getRequiredDocumentsForCall,
    ).toHaveBeenCalledWith('call-1');
  });
});
