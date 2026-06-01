export const PROGRAM_B_BACKLOG_MESSAGES = {
  BACKLOG_ITEM_NOT_FOUND: 'Backlog item not found',
  BACKLOG_DOCUMENT_NOT_FOUND: 'Program B backlog document not found',
  CANDIDATE_APPLICATION_NOT_FOUND: 'Program B candidate application not found',
  ONLY_DRAFT_MAY_BE_UPDATED: 'Only draft backlog items may be updated',
  ONLY_DRAFT_MAY_BE_DELETED: 'Only draft backlog items may be deleted',
  ONLY_DRAFT_MAY_BE_PUBLISHED: 'Only draft backlog items may be published',
  ONLY_DRAFT_OR_PUBLISHED_MAY_BE_ARCHIVED:
    'Only draft or published backlog items may be archived',
  ARCHIVED_ITEMS_ARE_READ_ONLY: 'Archived backlog items are read-only',
  ARCHIVED_ITEMS_DO_NOT_ACCEPT_DECISIONS:
    'Archived backlog items do not accept candidate decisions',
  ARCHIVED_ITEMS_CANNOT_CREATE_PROJECTS:
    'Archived backlog items cannot create Program B projects',
  ONLY_PUBLISHED_OR_PAIRING_ACCEPT_DECISIONS:
    'Only published or pairing backlog items accept candidate decisions',
  ONLY_SUBMITTED_MAY_BE_SHORTLISTED:
    'Only submitted candidates may be shortlisted',
  ONLY_SUBMITTED_OR_SHORTLISTED_MAY_BE_ACCEPTED:
    'Only submitted or shortlisted candidates may be accepted',
  ONLY_SUBMITTED_OR_SHORTLISTED_MAY_BE_REJECTED:
    'Only submitted or shortlisted candidates may be rejected',
  CANDIDATE_ALREADY_ACCEPTED:
    'A candidate has already been accepted for this backlog item',
  ONLY_ACCEPTED_MAY_HAND_OFF:
    'Only accepted candidates may be handed off into a project',
  ACTIVE_PRODUCT_OWNER_REQUIRED:
    'Backlog item must have an active product owner before project handoff',
  PROJECT_ALREADY_EXISTS:
    'A Program B project already exists for this candidate',
  PRODUCT_OWNER_NOT_FROM_SAME_ORG:
    'Product owner must be a member of the same organization',
  TARGET_USER_MUST_BE_ACTIVE_ORG_MEMBER:
    'Target user must be an active member of the same organization',
  PRODUCT_OWNER_CANNOT_BE_ASSIGNED_ARCHIVED:
    'Product Owner cannot be assigned to an archived backlog item',
  PRODUCT_OWNER_CANNOT_BE_ASSIGNED_CURRENT_STATE:
    'Product Owner cannot be assigned in the current backlog state',
  TARGET_USER_NOT_FOUND: 'Target user not found',
  DOCUMENT_NOT_AVAILABLE_FOR_READING:
    'Document is not available for reading yet',
  TITLE_REQUIRED_FOR_PUBLISH: 'Title is required for publish',
  DESCRIPTION_REQUIRED_FOR_PUBLISH: 'Description is required for publish',
  BUDGET_MUST_BE_POSITIVE: 'Budget must be greater than 0 for publish',
  REQUEST_BODY_EMPTY: 'Request body is empty',
  ONLY_ACTIVE_STUDENTS_MAY_BROWSE:
    'Only active student users may browse published backlog items',
  ONLY_ACTIVE_ORG_MEMBERS_MAY_MANAGE:
    'Only active organization members may manage backlog items',
  DOCUMENT_VERSION_CONFLICT:
    'Could not assign a unique document version for this category',
} as const;
