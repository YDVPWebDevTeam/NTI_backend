import type {
  ProgramBDocumentVisibility,
  UploadStatus,
} from '../../../../generated/prisma/enums';

type ProgramBDocumentRow<TCategory> = {
  id: string;
  category: TCategory;
  visibility: ProgramBDocumentVisibility;
  version: number;
  createdAt: Date;
  uploadedFile: {
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
    status: UploadStatus;
    uploadedAt: Date | null;
  };
};

type ProgramBDocumentDto<TCategory> = {
  id: string;
  fileId: string;
  category: TCategory;
  visibility: ProgramBDocumentVisibility;
  name: string;
  mimeType: string;
  size: number;
  status: UploadStatus;
  version: number;
  uploadedAt?: Date;
  createdAt: Date;
};

/**
 * Maps a stored Program B document (backlog or project) plus its uploaded file
 * to the shared document DTO shape. The document category enum differs between
 * backlog and project documents, so it is preserved via the generic parameter.
 */
export function toProgramBDocumentDto<TCategory>(
  document: ProgramBDocumentRow<TCategory>,
): ProgramBDocumentDto<TCategory> {
  return {
    id: document.id,
    fileId: document.uploadedFile.id,
    category: document.category,
    visibility: document.visibility,
    name: document.uploadedFile.originalName,
    mimeType: document.uploadedFile.mimeType,
    size: document.uploadedFile.size,
    status: document.uploadedFile.status,
    version: document.version,
    uploadedAt: document.uploadedFile.uploadedAt ?? undefined,
    createdAt: document.createdAt,
  };
}
