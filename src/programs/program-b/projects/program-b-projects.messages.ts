export const PROGRAM_B_PROJECTS_MESSAGES = {
  PROJECT_NOT_FOUND: 'Program B project not found',
  PROJECT_DOCUMENT_NOT_FOUND: 'Program B project document not found',
  MILESTONE_NOT_FOUND: 'Milestone not found',
  MENTOR_USER_NOT_FOUND: 'Mentor user not found',
  TARGET_USER_MUST_BE_ACTIVE_MENTOR: 'Target user must be an active mentor',

  DOCUMENT_NOT_AVAILABLE_FOR_READING:
    'Document is not available for reading yet',

  CLOSED_PROJECTS_ARE_READ_ONLY: 'Closed Program B projects are read-only',

  REQUEST_BODY_EMPTY: 'Request body is empty',

  ONLY_COMPANY_MEMBERS_MAY_MANAGE_MILESTONES:
    'Only company-side project members may manage milestones',

  ONLY_COMPANY_MEMBERS_OR_ASSIGNED_MENTORS_MAY_MANAGE_MILESTONES:
    'Only company-side project members or the assigned mentor may manage milestones',

  ONLY_REVIEWERS_AND_MENTORS_MAY_CREATE_NOTES:
    'Only NTI-side reviewers and mentors may create mentoring notes',

  ONLY_REVIEWERS_AND_ASSIGNED_MENTORS_MAY_CREATE_NOTES:
    'Only NTI-side reviewers and assigned mentors may create mentoring notes',

  ONLY_ACTIVE_PO_MAY_CREATE_PO_REVIEWS:
    'Only the active assigned product owner may create PO reviews',

  ONLY_REVIEWERS_MAY_ASSIGN_MENTOR:
    'Only NTI-side reviewers may assign a mentor',

  ONLY_PO_OR_COMPANY_OWNER_MAY_RECORD_ACCEPTANCE:
    'Only the product owner or same-organization company owner may record company acceptance',

  ONLY_REVIEWERS_MAY_RECORD_NTI_ACCEPTANCE:
    'Only NTI-side reviewers may record NTI acceptance',

  DOCUMENT_VERSION_CONFLICT:
    'Could not assign a unique document version for this category',
} as const;
