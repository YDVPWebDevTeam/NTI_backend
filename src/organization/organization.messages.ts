export const ORGANIZATION_MESSAGES = {
  ORGANIZATION_NOT_FOUND: 'Organization not found',
  INVITATION_NOT_FOUND: 'Invitation not found',
  ICO_ALREADY_EXISTS: 'ICO already exists',
  ICO_CANNOT_BE_NULL: 'ICO cannot be null',
  ICO_CANNOT_BE_CHANGED:
    'ICO cannot be changed after organization is processed',
  REQUEST_BODY_EMPTY: 'Request body is empty',
  USER_ALREADY_LINKED_TO_ORG: 'User already linked to organization',
  USER_IS_ALREADY_LINKED_TO_ORG: 'User is already linked to an organization',
  ACTIVE_INVITE_ALREADY_EXISTS: 'Active organization invite already exists',
  INVITATION_TOKEN_MISMATCH:
    'Invitation token does not belong to the authenticated user',
  INVITATION_ALREADY_ACCEPTED: 'Invitation already accepted',
  INVITATION_HAS_BEEN_CANCELED: 'Invitation has been canceled',
  INVITATION_HAS_EXPIRED: 'Invitation has expired',
  INVITATION_IS_NOT_ACTIVE: 'Invitation is not active',
  INVITATION_ROLE_NOT_PERMITTED:
    'Invitation role is not permitted for organization invites',
  ONLY_PENDING_NON_EXPIRED_CAN_BE_REVOKED:
    'Only pending and non-expired invites can be revoked',
  ONLY_PENDING_NON_EXPIRED_CAN_BE_RESENT:
    'Only pending and non-expired invites can be resent',
  ORGANIZATION_NOT_ACCEPTING_INVITES:
    'Organization is not accepting invitations',
  MEMBER_NOT_FOUND: 'Member not found',
  USE_OWNERSHIP_TRANSFER_ENDPOINT:
    'Use ownership transfer endpoint to set company owner',
  CURRENT_OWNER_ROLE_CANNOT_BE_CHANGED:
    'Current owner role cannot be changed directly',
  CURRENT_OWNER_CANNOT_BE_REMOVED: 'Current owner cannot be removed',
  USER_IS_ALREADY_OWNER: 'User is already organization owner',
  CURRENT_OWNER_NOT_FOUND: 'Current owner not found',
  NEW_OWNER_MUST_BE_ACTIVE: 'New owner must be active',
} as const;
