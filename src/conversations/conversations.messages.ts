export const CONVERSATIONS_MESSAGES = {
  PROJECT_NOT_FOUND: 'Program B project not found',
  APPLICATION_NOT_FOUND: 'Application not found',
  CONVERSATION_CHANNEL_NOT_FOUND: 'Conversation channel not found',
  MESSAGE_NOT_FOUND: 'Conversation message not found',
  ATTACHMENT_NOT_FOUND: 'Conversation attachment not found',

  NO_ACCESS_TO_CHANNEL: 'You do not have access to this conversation channel',

  CHANNEL_READ_ONLY:
    'This conversation is read-only because the project or application is closed',

  PROGRAM_A_HAS_NO_PARTICIPANTS_CHANNEL:
    'Program A applications do not have a participants conversation channel',

  ONLY_AUTHOR_MAY_EDIT: 'Only the message author may edit this message',
  ONLY_AUTHOR_MAY_DELETE: 'Only the message author may delete this message',
  MESSAGE_ALREADY_DELETED: 'This message has already been deleted',

  ATTACHMENT_FILE_NOT_FOUND: 'One or more attachment files were not found',
  ATTACHMENT_FILE_NOT_OWNED:
    'Attachment files must be uploaded by the message author',
  ATTACHMENT_FILE_NOT_UPLOADED:
    'Attachment files must be fully uploaded before they can be attached',
  ATTACHMENT_NOT_AVAILABLE_FOR_READING:
    'Attachment is not available for download yet',
  TOO_MANY_ATTACHMENTS: 'A message may have at most 10 attachments',
} as const;
