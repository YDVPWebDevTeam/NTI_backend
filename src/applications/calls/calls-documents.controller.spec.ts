jest.mock('./calls.service', () => ({
  CallsService: class CallsService {},
}));

jest.mock('../../auth/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: class JwtAuthGuard {},
}));

import { CallsDocumentsController } from './calls-documents.controller';
import { CallsService } from './calls.service';

describe('CallsDocumentsController', () => {
  it('delegates required document lookup to the calls service', async () => {
    const callsService = {
      getRequiredDocumentsForCall: jest
        .fn()
        .mockResolvedValue({ callId: 'call-1' }),
    };

    const controller = new CallsDocumentsController(
      callsService as unknown as CallsService,
    );

    await expect(controller.getRequiredDocuments('call-1')).resolves.toEqual({
      callId: 'call-1',
    });
    expect(callsService.getRequiredDocumentsForCall).toHaveBeenCalledWith(
      'call-1',
    );
  });
});
