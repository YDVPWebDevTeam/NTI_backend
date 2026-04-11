import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetUserContext } from '../auth/decorators/get-user-context.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import {
  CompleteUploadApi,
  RequestDownloadUrlApi,
  RequestUploadUrlApi,
} from './api-docs';
import { CompleteUploadDto } from './dto/complete-upload.dto';
import { DownloadUrlDto } from './dto/download-url.dto';
import { RequestDownloadUrlDto } from './dto/request-download-url.dto';
import { RequestUploadDto } from './dto/request-upload.dto';
import { UploadedFileDto } from './dto/uploaded-file.dto';
import { UploadInstructionsDto } from './dto/upload-instructions.dto';
import { FilesService } from './files.service';

@ApiTags('Files')
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @RequestUploadUrlApi()
  @HttpCode(HttpStatus.CREATED)
  @Post('upload-url')
  requestUploadUrl(
    @GetUserContext() authUser: AuthenticatedUserContext,
    @Body() dto: RequestUploadDto,
  ): Promise<UploadInstructionsDto> {
    return this.filesService.requestUpload(authUser, dto);
  }

  @RequestDownloadUrlApi()
  @HttpCode(HttpStatus.OK)
  @Get(':id/download-url')
  requestDownloadUrl(
    @GetUserContext() authUser: AuthenticatedUserContext,
    @Param('id', new ParseUUIDPipe()) fileId: string,
    @Query() query: RequestDownloadUrlDto,
  ): Promise<DownloadUrlDto> {
    return this.filesService.requestDownloadUrl(
      authUser,
      fileId,
      query.disposition,
    );
  }

  @CompleteUploadApi()
  @HttpCode(HttpStatus.OK)
  @Post('complete')
  completeUpload(
    @GetUserContext() authUser: AuthenticatedUserContext,
    @Body() dto: CompleteUploadDto,
  ): Promise<UploadedFileDto> {
    return this.filesService.completeUpload(authUser, dto);
  }
}
