import { Injectable, NotFoundException } from '@nestjs/common';
import type { Call, Prisma } from '../../generated/prisma/client';
import { CallStatus, ProgramType } from '../../generated/prisma/enums';
import { CallsRepository } from '../applications/calls.repository';
import { PublicActiveCallsQueryDto } from './dto/public-active-calls-query.dto';
import { PublicCallDetailDto } from './dto/public-call-detail.dto';
import { PublicCallItemDto } from './dto/public-call-item.dto';
import { PublicCallsQueryDto } from './dto/public-calls-query.dto';
import { PublicCallsResponseDto } from './dto/public-calls-response.dto';
import { PublicProgramDto } from './dto/public-program.dto';
import { PUBLIC_PROGRAMS } from './public-programs.constants';

@Injectable()
export class PublicService {
  constructor(private readonly callsRepository: CallsRepository) {}

  listPrograms(): PublicProgramDto[] {
    return PUBLIC_PROGRAMS.map((program) => ({ ...program }));
  }

  async listProgramCalls(
    programId: string,
    query: PublicCallsQueryDto,
  ): Promise<PublicCallsResponseDto> {
    const programType = this.resolveProgramTypeOrThrow(programId);
    return this.listCalls({ ...query, programType });
  }

  async listActiveCalls(
    query: PublicActiveCallsQueryDto,
  ): Promise<PublicCallsResponseDto> {
    const programType = query.programId
      ? this.resolveProgramTypeOrThrow(query.programId)
      : undefined;

    return this.listCalls({ ...query, programType });
  }

  async findCallById(id: string): Promise<PublicCallDetailDto> {
    const call = await this.callsRepository.findPublicVisibleById(
      id,
      new Date(),
    );

    if (!call) {
      throw new NotFoundException('Public call not found');
    }

    return this.toCallDto(call);
  }

  private async listCalls(input: {
    page?: number;
    limit?: number;
    sort?: PublicCallsQueryDto['sort'];
    programType?: ProgramType;
  }): Promise<PublicCallsResponseDto> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    const skip = (page - 1) * limit;
    const now = new Date();

    const [calls, total] = await Promise.all([
      this.callsRepository.findPublicVisibleMany({
        now,
        programType: input.programType,
        skip,
        take: limit,
        orderBy: this.buildOrderBy(input.sort),
      }),
      this.callsRepository.countPublicVisible({
        now,
        programType: input.programType,
      }),
    ]);

    return {
      data: calls.map((call) => this.toCallDto(call)),
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  private resolveProgramTypeOrThrow(programId: string): ProgramType {
    const normalized = programId.trim().toLowerCase();

    const matchedProgram = PUBLIC_PROGRAMS.find(
      (program) =>
        program.id.toLowerCase() === normalized ||
        program.slug.toLowerCase() === normalized,
    );

    if (!matchedProgram) {
      throw new NotFoundException('Program not found');
    }

    return matchedProgram.id;
  }

  private buildOrderBy(
    sort: PublicCallsQueryDto['sort'] = 'closesAt:asc',
  ): Prisma.CallOrderByWithRelationInput[] {
    const [field, direction] = sort.split(':') as [
      'closesAt' | 'opensAt' | 'createdAt',
      'asc' | 'desc',
    ];

    return [
      { [field]: direction },
      { createdAt: direction === 'asc' ? 'asc' : 'desc' },
      { id: 'asc' },
    ];
  }

  private toCallDto(call: Call): PublicCallItemDto {
    return {
      id: call.id,
      programId: call.type,
      type: call.type,
      title: call.title,
      status: CallStatus.OPEN,
      opensAt: call.opensAt,
      closesAt: call.closesAt,
    };
  }
}
