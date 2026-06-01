import { Injectable, NotFoundException } from '@nestjs/common';
import { ProgramType } from '../../../generated/prisma/enums';
import {
  buildOrderBy,
  buildPaginationMeta,
  resolvePagination,
} from '../../common/pagination';
import { toPublicCallDto } from '../application.mappers';
import { PublicCallDto } from '../dto/public-call.dto';
import { PublicCallsQueryDto } from '../dto/public-calls-query.dto';
import { PublicCallsResponseDto } from '../dto/public-calls-response.dto';
import { RequiredDocumentsResponseDto } from '../dto/required-documents-response.dto';
import { CallsRepository } from './calls.repository';

@Injectable()
export class CallsService {
  constructor(private readonly callsRepository: CallsRepository) {}

  async listPublicCalls(
    query: PublicCallsQueryDto,
  ): Promise<PublicCallsResponseDto> {
    return this.listCalls({
      query,
      activeOnly: false,
    });
  }

  async listActivePublicCalls(
    query: PublicCallsQueryDto,
  ): Promise<PublicCallsResponseDto> {
    return this.listCalls({
      query,
      activeOnly: true,
    });
  }

  async findPublicCallById(id: string): Promise<PublicCallDto> {
    const call = await this.callsRepository.findPublicById(id);

    if (!call) {
      throw new NotFoundException('Public call not found');
    }

    return toPublicCallDto(call);
  }

  async getRequiredDocumentsForCall(
    callId: string,
  ): Promise<RequiredDocumentsResponseDto> {
    const call =
      await this.callsRepository.findByIdWithRequiredDocumentTypes(callId);

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    return {
      callId: call.id,
      programType: call.type,
      requiredDocuments:
        call.type === ProgramType.PROGRAM_A
          ? call.requiredDocumentTypes.map((document) => ({
              id: document.id,
              documentType: document.documentType,
              isRequired: document.isRequired,
            }))
          : [],
    };
  }

  private async listCalls(input: {
    query: PublicCallsQueryDto;
    activeOnly: boolean;
  }): Promise<PublicCallsResponseDto> {
    const pagination = resolvePagination(input.query);
    const orderBy = buildOrderBy(input.query.sort, input.query.order, [
      { createdAt: input.query.order },
      { id: 'asc' },
    ]);
    const now = new Date();

    const [calls, total] = input.activeOnly
      ? await Promise.all([
          this.callsRepository.findPublicVisibleMany({
            now,
            programType: input.query.type,
            skip: pagination.skip,
            take: pagination.take,
            orderBy,
          }),
          this.callsRepository.countPublicVisible({
            now,
            programType: input.query.type,
          }),
        ])
      : await Promise.all([
          this.callsRepository.findPublicMany({
            programType: input.query.type,
            skip: pagination.skip,
            take: pagination.take,
            orderBy,
          }),
          this.callsRepository.countPublic({
            programType: input.query.type,
          }),
        ]);

    return {
      data: calls.map((call) => toPublicCallDto(call)),
      meta: buildPaginationMeta(total, pagination.page, pagination.limit),
    };
  }
}
