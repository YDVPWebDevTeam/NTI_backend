export const TEAM_MESSAGES = {
  TEAM_NOT_FOUND: 'Team not found',
  TEAM_MEMBER_NOT_FOUND: 'Team member not found',
  TEAM_IS_LOCKED: 'Team is locked',
  ARCHIVED_TEAM_CANNOT_BE_USED: 'Archived team cannot be used',
  ONLY_TEAM_LEADER_CAN_ACT: 'Only team leader can act on this team',
  MULTIPLE_ACTIVE_TEAMS: 'Multiple active teams found for current user',
  CURRENT_TEAM_NOT_FOUND: 'Current team not found',
  FAILED_TO_LOAD_CREATED_TEAM: 'Failed to load created team',
  FAILED_TO_ENQUEUE_INVITATION_EMAILS: 'Failed to enqueue invitation emails',
  CANNOT_REMOVE_CURRENT_LEADER: 'Cannot remove current team leader',
  LEADER_MUST_TRANSFER_BEFORE_LEAVING:
    'Current team leader must transfer leadership before leaving team',
  INVITATION_NOT_FOUND: 'Invitation not found',
  INVITATION_IS_NOT_ACTIVE: 'Invitation is not active',
  INVITATION_ALREADY_ACCEPTED: 'Invitation already accepted',
  INVITATION_EXPIRED_OR_REVOKED: 'Invitation expired or revoked',
  INVITATION_IS_EXPIRED_OR_ACCEPTED:
    'Invitation is expired, revoked, or already accepted',
  INVITATION_TOKEN_MISMATCH:
    'Invitation token does not belong to the authenticated user',
  USER_ALREADY_TEAM_MEMBER: 'User is already a team member',
  ONLY_PENDING_NON_EXPIRED_CAN_BE_RESENT:
    'Only pending and non-expired invites can be resent',
  FAILED_TO_CREATE_INVITATIONS:
    'Failed to create invitations due to repeated token collisions',
  FAILED_TO_RESEND_INVITATION:
    'Failed to resend invitation due to repeated token collisions',
} as const;
