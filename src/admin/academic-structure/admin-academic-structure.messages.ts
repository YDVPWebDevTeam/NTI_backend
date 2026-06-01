export const ADMIN_ACADEMIC_STRUCTURE_MESSAGES = {
  ADMIN_ONLY_MANAGE: 'Only administrators can manage academic structure',
  ADMIN_ONLY_ACCESS: 'Only administrators can access academic structure',
  UNIVERSITY_NOT_FOUND: 'University not found',
  FACULTY_NOT_FOUND: 'Faculty not found',
  SPECIALIZATION_NOT_FOUND: 'Specialization not found',
  UNIVERSITY_UNIQUE_FIELDS_CONFLICT:
    'University with same unique fields already exists',
  FACULTY_NAME_CONFLICT:
    'Faculty with this name already exists in selected university',
  SPECIALIZATION_NAME_CONFLICT:
    'Specialization with this name already exists in selected faculty',
  REFERENCED_RELATION_DOES_NOT_EXIST: 'Referenced relation does not exist',
} as const;
