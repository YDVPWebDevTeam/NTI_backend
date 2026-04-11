import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiParam,
  ApiPayloadTooLargeResponse,
  ApiQuery,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FileVisibility, UploadStatus } from '../../../generated/prisma/enums';
import { createApiDecorator } from '../../infrastructure/api-docs/api-docs-factory';
import { CompleteUploadDto } from '../dto/complete-upload.dto';
import { DownloadUrlDto } from '../dto/download-url.dto';
import { FILE_URL_DISPOSITIONS } from '../dto/request-download-url.dto';
import { RequestUploadDto } from '../dto/request-upload.dto';
import { UploadInstructionsDto } from '../dto/upload-instructions.dto';
import { UploadedFileDto } from '../dto/uploaded-file.dto';

export const RequestUploadUrlApi = () =>
  createApiDecorator({
    summary: 'Request a presigned upload URL',
    description: [
      'Creates a pending file record and returns a temporary presigned PUT URL for direct upload to Cloudflare R2.',
      '',
      'Use this endpoint first. The returned uploadUrl is not a file preview link and it is not meant to be opened in the browser. It is a temporary signed storage URL that the frontend must call with an HTTP PUT request and the raw file bytes as the request body.',
      '',
      'Frontend flow:',
      '1. Call POST /files/upload-url with filename, mimeType, and size from the selected browser file.',
      '2. Upload the file directly to the returned uploadUrl using fetch with method PUT, Content-Type equal to the file MIME type, and the file as the request body.',
      '3. After the PUT request succeeds, call POST /files/complete with the returned fileId.',
      '',
      'Important details:',
      '- Send the file as a raw binary body. Do not wrap it in JSON.',
      '- Do not use FormData for the presigned upload unless the backend explicitly signs a multipart form upload. This endpoint signs a PUT object upload, so FormData will change the payload and usually break the signature.',
      '- Keep the Content-Type equal to the mimeType sent when requesting the URL.',
      '- Upload before expiresAt, otherwise request a new URL.',
      '- Set visibility to PUBLIC only for files that are intended to be publicly readable through a stable URL. Leave it as PRIVATE for protected documents such as audit PDFs.',
    ].join('\n'),
    body: {
      type: RequestUploadDto,
      description:
        'Metadata used to validate the upload and create the storage object key.',
      examples: {
        imageUpload: {
          summary: 'PNG image upload request',
          value: {
            filename: 'avatar.png',
            mimeType: 'image/png',
            size: 124991,
            visibility: FileVisibility.PUBLIC,
            purpose: 'general',
            entityType: 'user',
          },
        },
      },
    },
    successResponse: {
      status: 201,
      type: UploadInstructionsDto,
      description:
        'Upload instructions were generated successfully. Use uploadUrl in a direct PUT request from the frontend, then finalize with POST /files/complete.',
      examples: {
        presignedPutUrl: {
          summary: 'Successful presigned upload response',
          value: {
            fileId: 'dc1f54c3-8bd3-41a1-ae9f-5eb039715c1f',
            key: 'users/fae01d73-b528-4af1-9765-f22ba9cf6e02/general/2026-04-08/dc1f54c3-8bd3-41a1-ae9f-5eb039715c1f.png',
            uploadUrl:
              'https://93a195452e08956a31bcbd3b8d185d5f.r2.cloudflarestorage.com/nti-bucket/users/fae01d73-b528-4af1-9765-f22ba9cf6e02/general/2026-04-08/dc1f54c3-8bd3-41a1-ae9f-5eb039715c1f.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=300&x-id=PutObject',
            publicUrl:
              'https://cdn.example.com/users/fae01d73-b528-4af1-9765-f22ba9cf6e02/general/2026-04-08/dc1f54c3-8bd3-41a1-ae9f-5eb039715c1f.png',
            expiresAt: '2026-04-08T19:46:00.000Z',
          },
          description:
            'The frontend must upload the selected file to uploadUrl with HTTP PUT before expiresAt. publicUrl is present only for PUBLIC files.',
        },
      },
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiBadRequestResponse({
        description: 'File type is not allowed or input is invalid.',
      }),
      ApiPayloadTooLargeResponse({
        description: 'Requested file size exceeds allowed limit.',
      }),
    ],
  });

export const CompleteUploadApi = () =>
  createApiDecorator({
    summary: 'Mark uploaded file as complete',
    description: [
      'Call this endpoint after the frontend successfully uploads the file bytes to the presigned uploadUrl.',
      '',
      'This endpoint does not upload the file itself. It finalizes the pending file record created by POST /files/upload-url and marks it as uploaded.',
      '',
      'Typical frontend sequence:',
      '1. POST /files/upload-url',
      '2. PUT uploadUrl with the raw File object',
      '3. POST /files/complete with fileId and optionally size',
      '',
      'If the upload URL expired, request a new one and repeat the flow.',
      '',
    ].join('\n'),
    body: {
      type: CompleteUploadDto,
      description:
        'Identifiers needed to finalize a file after the direct upload request succeeds.',
      examples: {
        finalizeUpload: {
          summary: 'Finalize uploaded file',
          value: {
            fileId: 'a16947f8-8f55-4a70-906d-f5dd15c92256',
            size: 124991,
          },
        },
      },
    },
    successResponse: {
      status: 200,
      type: UploadedFileDto,
      description: 'File upload was finalized successfully.',
      examples: {
        uploadedFile: {
          summary: 'Uploaded file metadata',
          value: {
            id: 'a16947f8-8f55-4a70-906d-f5dd15c92256',
            ownerId: 'fae01d73-b528-4af1-9765-f22ba9cf6e02',
            key: 'users/fae01d73-b528-4af1-9765-f22ba9cf6e02/general/2026-04-08/dc1f54c3-8bd3-41a1-ae9f-5eb039715c1f.png',
            originalName: 'avatar.png',
            visibility: FileVisibility.PUBLIC,
            status: UploadStatus.UPLOADED,
            publicUrl:
              'https://cdn.example.com/users/fae01d73-b528-4af1-9765-f22ba9cf6e02/general/2026-04-08/dc1f54c3-8bd3-41a1-ae9f-5eb039715c1f.png',
            uploadedAt: '2026-04-08T19:45:12.000Z',
          },
        },
      },
    },
    extraDecorators: [ApiBearerAuth('access-token')],
    errors: [
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiNotFoundResponse({
        description: 'Pending file was not found for current user.',
      }),
      ApiConflictResponse({
        description: 'Upload is expired or already failed.',
      }),
      ApiBadRequestResponse({
        description: 'Uploaded object metadata does not match the request.',
      }),
    ],
  });

export const RequestDownloadUrlApi = () =>
  createApiDecorator({
    summary: 'Request a presigned download URL',
    description: [
      'Returns a short-lived presigned GET URL for a file owned by the current user.',
      '',
      'PRIVATE files receive a short-lived signed URL. PUBLIC files receive their stable public URL.',
      '',
      'Frontend usage examples:',
      '1. For previews: set an img src or iframe src to the returned downloadUrl.',
      '2. For manual downloads: use the returned downloadUrl in an anchor element or call window.open(downloadUrl).',
      '3. For custom handling: fetch the returned URL and read the response as a blob.',
      '',
      'The URL is temporary. If it expires, request a new one.',
    ].join('\n'),
    successResponse: {
      status: 200,
      type: DownloadUrlDto,
      description:
        'Temporary read URL was generated successfully for an uploaded file.',
      examples: {
        inlinePreview: {
          summary: 'Inline preview URL',
          value: {
            downloadUrl:
              'https://93a195452e08956a31bcbd3b8d185d5f.r2.cloudflarestorage.com/nti-bucket/users/fae01d73-b528-4af1-9765-f22ba9cf6e02/general/2026-04-08/dc1f54c3-8bd3-41a1-ae9f-5eb039715c1f.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=300&x-id=GetObject',
            expiresAt: '2026-04-08T20:10:00.000Z',
          },
        },
      },
    },
    extraDecorators: [
      ApiBearerAuth('access-token'),
      ApiParam({
        name: 'id',
        description: 'Uploaded file identifier.',
        example: 'a16947f8-8f55-4a70-906d-f5dd15c92256',
      }),
      ApiQuery({
        name: 'disposition',
        required: false,
        enum: FILE_URL_DISPOSITIONS,
        description:
          'Use inline for previews or attachment to suggest a browser download.',
        example: 'inline',
      }),
    ],
    errors: [
      ApiUnauthorizedResponse({
        description: 'Bearer token is missing or invalid.',
      }),
      ApiNotFoundResponse({
        description: 'Uploaded file was not found for current user.',
      }),
      ApiConflictResponse({
        description: 'File is not yet uploaded or cannot be accessed.',
      }),
      ApiBadRequestResponse({
        description: 'Request parameters are invalid.',
      }),
    ],
  });
