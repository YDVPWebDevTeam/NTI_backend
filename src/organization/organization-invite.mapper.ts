import type { OrgInvitation } from '../../generated/prisma/client';
import { resolveDisplayInvitationStatus } from '../common/invitations/invitation-state.utils';
import { OrganizationInviteItemDto } from './dto/organization-invite-item.dto';

/**
 * Maps a stored organization invitation to its API representation, deriving the
 * effective display status. Shared by the member-facing and admin-facing
 * organization invite services.
 */
export function toOrganizationInviteItemDto(
  invitation: OrgInvitation,
  now: Date,
): OrganizationInviteItemDto {
  return {
    id: invitation.id,
    email: invitation.email,
    status: resolveDisplayInvitationStatus(invitation, now),
    roleToAssign: invitation.roleToAssign,
    createdAt: invitation.createdAt,
    expiresAt: invitation.expiresAt,
    acceptedAt: invitation.acceptedAt,
    revokedAt: invitation.revokedAt,
  };
}
