export const STUDENT_PROFILE_MESSAGES = {
  USER_NOT_FOUND: 'User not found',
  UNIVERSITY_NOT_FOUND: 'Selected university does not exist',
  FACULTY_NOT_FOUND: 'Selected faculty does not exist',
  SPECIALIZATION_NOT_FOUND: 'Selected specialization does not exist',
  UNIVERSITY_NOT_ACTIVE: 'Selected university is not active',
  FACULTY_NOT_ACTIVE: 'Selected faculty is not active',
  SPECIALIZATION_NOT_ACTIVE: 'Selected specialization is not active',
  FACULTY_NOT_IN_UNIVERSITY:
    'Selected faculty does not belong to selected university',
  SPECIALIZATION_NOT_IN_FACULTY:
    'Selected specialization does not belong to selected faculty',
  FILE_NOT_EXIST_OR_NOT_OWNED: 'File does not exist or does not belong to user',
  FILE_MUST_BE_UPLOADED: 'File must be uploaded before being attached',
  ACADEMIC_DECLARATION_REQUIRED: 'Academic declaration must be accepted',
  ONE_SKILL_MUST_BE_PRIMARY: 'At least one skill must be marked as primary',
  ACADEMIC_MUST_BE_COMPLETED:
    'Academic information must be completed before professional skills',
} as const;
