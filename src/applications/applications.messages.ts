export const APPLICATIONS_MESSAGES = {
  APPLICATION_NOT_FOUND: 'Application not found',
  PUBLIC_CALL_NOT_FOUND: 'Public call not found',
  CALL_NOT_FOUND: 'Call not found',
  TEAM_NOT_FOUND: 'Team not found',
  SECTION_NOT_FOUND: 'Section not found',
  VERSION_NOT_FOUND_IN_HISTORY: 'Version not found in history',
  ACTIVE_APPLICATION_ALREADY_EXISTS:
    'An active application for this team and call already exists',
  APPLICATION_IS_MISSING_DOCUMENTS: 'Application is missing required documents',
  APPLICATION_ALREADY_DECIDED: 'Application is already decided',
  APPLICATION_DECISION_CHANGED_CONCURRENTLY:
    'Application decision was changed concurrently. Please retry.',
  DOCUMENT_ATTACHED_CONCURRENTLY:
    'Another document was attached to this slot concurrently. Please retry.',
  DECISION_RATIONALE_REQUIRED: 'Decision rationale is required',
  FILE_NOT_EXIST_OR_CANNOT_ATTACH:
    'File does not exist or cannot be attached to this application',
  FILE_MUST_BE_UPLOADED:
    'File must be uploaded before being attached to application documents',
  DUPLICATE_EVALUATION_CRITERION_CODES: 'Duplicate evaluation criterion codes',
  AT_LEAST_ONE_EVALUATION_REQUIRED:
    'At least one complete evaluation is required before final decision',
  AT_LEAST_ONE_COMPLETE_EVALUATION:
    'At least one evaluation must contain all required criteria before final decision',
  EVALUATOR_ALREADY_SUBMITTED:
    'Evaluator has already submitted an evaluation for this application',
  ONLY_REVIEWER_CAN_LIST_INTERNAL:
    'Only reviewer-side users can list internal Program A applications',
  ONLY_MENTOR_CAN_LIST_MENTORED_PROGRAM_A:
    'Only mentors can list assigned Program A applications',
  ONLY_REVIEWER_CAN_CREATE_EVALUATIONS:
    'Only reviewer-side users can create application evaluations',
  ONLY_REVIEWER_CAN_VIEW_EVALUATIONS:
    'Only reviewer-side users can view application evaluations',
  ONLY_REVIEWER_CAN_MAKE_DECISIONS:
    'Only reviewer-side users can make application decisions',
  NO_ACCESS_TO_APPLICATION: 'You do not have access to this application',
  NO_PERMISSION_VIEW_APPLICATION:
    'You do not have permission to view this application',
  NO_PERMISSION_VIEW_ELIGIBILITY:
    'You do not have permission to view eligibility signals',
  ONLY_TEAM_LEAD_CAN_SUBMIT:
    'Only team lead can submit applications on behalf of the team',
  ONLY_TEAM_LEAD_CAN_MANAGE_DOCS:
    'Only team lead can manage application documents and submission',
  ONLY_TEAM_LEAD_CAN_REPLY_NEEDS_INFO:
    'Only team lead can reply to needs-info requests and resubmit the application',
  ONLY_TEAM_LEAD_CAN_UPDATE_SECTIONS:
    'Only team lead can update application sections',
  TEAM_ARCHIVED_CANNOT_SUBMIT:
    'Team is archived and cannot submit applications',
  ARCHIVED_APPS_READ_ONLY:
    'Archived applications are read-only for non-admin users',
  PROGRAM_A_DOC_PACK_ONLY:
    'Application document pack is supported only for Program A applications',
  PROGRAM_A_MENTORSHIP_ONLY:
    'Program A mentorship is supported only for Program A applications',
  PROGRAM_A_LIFECYCLE_ONLY:
    'Program A post-approval lifecycle is supported only for Program A applications',
  ONLY_REVIEWER_OR_MENTOR_CAN_VIEW_TRACKING:
    'Only reviewer-side users or the assigned mentor can view Program A tracking',
  ONLY_ADMIN_OR_MENTOR_CAN_MANAGE_TRACKING:
    'Only administrators or the assigned mentor can manage Program A tracking',
  ONLY_ADMIN_OR_MENTOR_CAN_ACCESS_NOTES:
    'Only the assigned mentor or an administrator can access mentorship notes',
  APPLICATION_HAS_NO_ASSIGNED_MENTOR: 'Application has no assigned mentor',
  SECTIONS_PROGRAM_A_ONLY:
    'Application sections are currently supported only for Program A applications',
  PROFILE_SECTION_PAYLOAD_INVALID:
    'Profile section payload must be an object with a non-empty string "name" field.',
  ADMIN_ACCESS_REQUIRED: 'Admin access required',
  ARCHIVED_CALLS_CANNOT_BE_UPDATED: 'Archived calls cannot be updated',
  CALL_ALREADY_OPEN: 'Call is already open',
  ARCHIVED_CALLS_CANNOT_BE_REOPENED: 'Archived calls cannot be reopened',
  ONLY_OPEN_CALLS_CAN_BE_CLOSED: 'Only open calls can be closed',
  ONLY_CLOSED_CALLS_CAN_BE_ARCHIVED: 'Only closed calls can be archived',
  PROGRAM_A_OPTIONS_MUST_BE_UNIQUE: 'Program A option values must be unique',
  PROGRAM_B_CANNOT_DEFINE_DOCUMENT_TYPES:
    'PROGRAM_B calls cannot define required document types',
  OPENS_AT_MUST_BE_BEFORE_CLOSES_AT: 'opensAt must be before closesAt',
  CALL_MUST_DEFINE_DATE_WINDOW:
    'Call must define both opensAt and closesAt before opening',
  PROGRAM_A_MUST_DEFINE_DOCUMENT_TYPES:
    'PROGRAM_A calls must define at least one required document type before opening',
  MENTOR_USER_NOT_FOUND: 'Mentor user not found',
  MENTOR_ROLE_REQUIRED: 'Target user must have mentor role',
  MILESTONE_TITLE_CANNOT_BE_EMPTY: 'Milestone title cannot be empty',
  PROGRAM_A_MILESTONE_NOT_FOUND: 'Program A milestone not found',
  ONLY_REVIEWER_CAN_REQUEST_INFO:
    'Only reviewer-side users can request additional information',
  APPLICATION_STATUS_CHANGED_CONCURRENTLY:
    'Application status was changed concurrently. Please retry.',
  NEEDS_INFO_REPLIES_ONLY_IN_NEEDS_INFO_STATUS:
    'Needs-info replies are allowed only while application is in NEEDS_INFO status',
  NEEDS_INFO_ITEM_NOT_FOUND: 'Needs-info item not found',
  NEEDS_INFO_ITEM_ALREADY_RESOLVED: 'Needs-info item is already resolved',
  REASON_REQUIRED_FOR_TRANSITION: 'Reason is required for this transition',
} as const;
