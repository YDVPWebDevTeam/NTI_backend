import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '../../generated/prisma/client';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import { AuditRepository, type AuditEventWithActor } from './audit.repository';
import {
  REPORT_EXPORT_ACTION,
  REPORT_EXPORT_ENTITY_TYPE,
  type ReportDataset,
  type ReportFormat,
} from './reports.constants';

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  if (value === null) {
    return 'null';
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, toJsonValue(item)]),
    );
  }

  return JSON.stringify(value);
}

type RecordReportExportRequestedInput = {
  actor: AuthenticatedUserContext;
  entityId?: string;
  dataset: ReportDataset;
  format: ReportFormat;
  mode: 'sync' | 'async';
  rowCount: number;
  filters: Record<string, unknown>;
};

@Injectable()
export class AuditService {
  constructor(private readonly auditRepository: AuditRepository) {}

  async recordReportExportRequested(
    input: RecordReportExportRequestedInput,
  ): Promise<string> {
    const entityId = input.entityId ?? randomUUID();

    await this.auditRepository.create({
      actorUserId: input.actor.id,
      action: REPORT_EXPORT_ACTION,
      entityType: REPORT_EXPORT_ENTITY_TYPE,
      entityId,
      metadata: {
        dataset: input.dataset,
        format: input.format,
        mode: input.mode,
        rowCount: input.rowCount,
        filters: toJsonValue(input.filters),
        requestedAt: new Date().toISOString(),
      },
    });

    return entityId;
  }

  listExportAuditEvents(
    where?: Prisma.AuditEventWhereInput,
  ): Promise<AuditEventWithActor[]> {
    return this.auditRepository.findManyWithActor({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
  }
}
