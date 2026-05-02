import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  GetActivePublicCallsApi,
  GetPublicCallByIdApi,
  GetPublicProgramCallsApi,
  GetPublicProgramsApi,
} from './api-docs';
import { PublicActiveCallsQueryDto } from './dto/public-active-calls-query.dto';
import { PublicCallDetailDto } from './dto/public-call-detail.dto';
import { PublicCallsQueryDto } from './dto/public-calls-query.dto';
import { PublicCallsResponseDto } from './dto/public-calls-response.dto';
import { PublicProgramDto } from './dto/public-program.dto';
import { PublicService } from './public.service';

@ApiTags('Public')
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('programs')
  @GetPublicProgramsApi()
  listPrograms(): PublicProgramDto[] {
    return this.publicService.listPrograms();
  }

  @Get('programs/:programId/calls')
  @GetPublicProgramCallsApi()
  listProgramCalls(
    @Param('programId') programId: string,
    @Query() query: PublicCallsQueryDto,
  ): Promise<PublicCallsResponseDto> {
    return this.publicService.listProgramCalls(programId, query);
  }

  @Get('calls/active')
  @GetActivePublicCallsApi()
  listActiveCalls(
    @Query() query: PublicActiveCallsQueryDto,
  ): Promise<PublicCallsResponseDto> {
    return this.publicService.listActiveCalls(query);
  }

  @Get('calls/:id')
  @GetPublicCallByIdApi()
  findCallById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PublicCallDetailDto> {
    return this.publicService.findCallById(id);
  }
}
