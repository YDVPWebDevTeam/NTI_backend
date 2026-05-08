import { BadRequestException } from '@nestjs/common';
import { InvitationStatus } from '../../../generated/prisma/enums';

type InvitationState = {
  status: InvitationStatus;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date;
};

export function isPendingAndUnexpired(
  invitation: InvitationState,
  at: Date,
): boolean {
  return (
    invitation.status === InvitationStatus.PENDING &&
    invitation.acceptedAt === null &&
    invitation.revokedAt === null &&
    invitation.expiresAt > at
  );
}

export function assertPendingAndUnexpired(
  invitation: InvitationState,
  at: Date,
  message: string,
): void {
  if (!isPendingAndUnexpired(invitation, at)) {
    throw new BadRequestException(message);
  }
}
