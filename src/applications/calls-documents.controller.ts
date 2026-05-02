import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetRequiredDocumentsApi } from './api-docs';
import { RequiredDocumentsResponseDto } from './dto/required-documents-response.dto';
import { ApplicationsService } from './applications.service';

@ApiTags('Calls')
@UseGuards(JwtAuthGuard)
@Controller('calls')
export class CallsDocumentsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @GetRequiredDocumentsApi()
  @Get(':callId/required-documents')
  getRequiredDocuments(
    @Param('callId', ParseUUIDPipe) callId: string,
  ): Promise<RequiredDocumentsResponseDto> {
    return this.applicationsService.getRequiredDocumentsForCall(callId);
  }
}
