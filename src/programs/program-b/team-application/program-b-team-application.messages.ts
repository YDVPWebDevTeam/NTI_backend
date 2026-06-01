export const PROGRAM_B_TEAM_APPLICATION_MESSAGES = {
  BACKLOG_ITEM_NOT_FOUND: 'Backlog item not found',
  APPLICATION_NOT_FOUND: 'Application not found',
  NO_ACTIVE_PROGRAM_B_CALL: 'No active Program B call',
  BACKLOG_ITEM_MUST_BE_PUBLISHED: 'Backlog item must be published',
  PROPOSAL_TEXT_OR_FILE_REQUIRED:
    'Either proposalText or proposalFileId must be provided',
  PROPOSAL_FILE_NOT_FOUND: 'Proposal file not found',
  PROPOSAL_FILE_NOT_IN_UPLOADED_STATE: 'Proposal file is not in uploaded state',
  PROPOSAL_FILE_NOT_TEAM_MEMBER:
    'Proposal file does not belong to a team member',
  ONLY_ONE_CV_PER_MEMBER: 'Only one CV file may be provided per team member',
  ACTIVE_APPLICATION_ALREADY_EXISTS:
    'Active application already exists for this team and backlog item',
  ONLY_TEAM_LEADER_CAN_WITHDRAW: 'Only team leader can withdraw application',
  WITHDRAWAL_ONLY_FROM_SUBMITTED:
    'Withdrawal allowed only from SUBMITTED status',
} as const;
