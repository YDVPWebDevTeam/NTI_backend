import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from 'generated/prisma/enums';
import { GetUserContext } from '../../auth/decorators/get-user-context.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import { CompleteOrganizationDocumentUploadDto } from './dto/complete-organization-document-upload.dto';
import { CreateOrganizationDocumentUploadDto } from './dto/create-organization-document-upload.dto';
import { OrganizationDocumentDownloadDto } from './dto/organization-document-download.dto';
import { OrganizationDocumentDto } from './dto/organization-document.dto';
import { OrganizationDocumentUploadDto } from './dto/organization-document-upload.dto';
import { OrganizationDocumentsService } from './organization-documents.service';

@ApiTags('Organization Documents')
@Controller('/organizations/:id/documents')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRole.COMPANY_OWNER,
  UserRole.COMPANY_EMPLOYEE,
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
)
export class OrganizationDocumentsController {
  constructor(
    private readonly organizationDocumentsService: OrganizationDocumentsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createUpload(
    @Param('id', ParseUUIDPipe) organizationId: string,
    @Body() dto: CreateOrganizationDocumentUploadDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<OrganizationDocumentUploadDto> {
    return this.organizationDocumentsService.createUpload(
      organizationId,
      dto,
      user,
    );
  }

  @Post(':docId/complete')
  @HttpCode(HttpStatus.OK)
  completeUpload(
    @Param('id', ParseUUIDPipe) organizationId: string,
    @Param('docId', ParseUUIDPipe) documentId: string,
    @Body() dto: CompleteOrganizationDocumentUploadDto,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<OrganizationDocumentDto> {
    return this.organizationDocumentsService.completeUpload(
      organizationId,
      documentId,
      dto,
      user,
    );
  }

  @Get()
  listDocuments(
    @Param('id', ParseUUIDPipe) organizationId: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<OrganizationDocumentDto[]> {
    return this.organizationDocumentsService.listDocuments(
      organizationId,
      user,
    );
  }

  @Get(':docId/download')
  requestDownload(
    @Param('id', ParseUUIDPipe) organizationId: string,
    @Param('docId', ParseUUIDPipe) documentId: string,
    @GetUserContext() user: AuthenticatedUserContext,
  ): Promise<OrganizationDocumentDownloadDto> {
    return this.organizationDocumentsService.requestDownload(
      organizationId,
      documentId,
      user,
    );
  }
}
