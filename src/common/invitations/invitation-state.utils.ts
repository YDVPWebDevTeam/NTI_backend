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

type DisplayInvitationState = {
  status: InvitationStatus;
  acceptedAt?: Date | null;
  revokedAt: Date | null;
  expiresAt: Date;
};

/**
 * Derives the effective, user-facing invitation status, reconciling the stored
 * status with the timestamp columns (a row may still be PENDING while already
 * revoked/accepted/expired by time). `acceptedAt` is optional because some
 * invitation models (e.g. team invitations) do not track it.
 */
export function resolveDisplayInvitationStatus(
  invitation: DisplayInvitationState,
  now: Date,
): InvitationStatus {
  if (
    invitation.status === InvitationStatus.REVOKED ||
    invitation.revokedAt !== null
  ) {
    return InvitationStatus.REVOKED;
  }

  if (
    invitation.status === InvitationStatus.ACCEPTED ||
    invitation.acceptedAt != null
  ) {
    return InvitationStatus.ACCEPTED;
  }

  if (
    invitation.status === InvitationStatus.EXPIRED ||
    invitation.expiresAt <= now
  ) {
    return InvitationStatus.EXPIRED;
  }

  return InvitationStatus.PENDING;
}
