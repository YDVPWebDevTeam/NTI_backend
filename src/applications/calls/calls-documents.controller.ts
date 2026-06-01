import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetRequiredDocumentsApi } from '../api-docs';
import { RequiredDocumentsResponseDto } from '../dto/required-documents-response.dto';
import { CallsService } from './calls.service';

@ApiTags('Calls')
@UseGuards(JwtAuthGuard)
@Controller('calls')
export class CallsDocumentsController {
  constructor(private readonly callsService: CallsService) {}

  @GetRequiredDocumentsApi()
  @Get(':callId/required-documents')
  getRequiredDocuments(
    @Param('callId', ParseUUIDPipe) callId: string,
  ): Promise<RequiredDocumentsResponseDto> {
    return this.callsService.getRequiredDocumentsForCall(callId);
  }
}
