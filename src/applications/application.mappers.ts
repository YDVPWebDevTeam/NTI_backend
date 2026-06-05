import {
  ApplicationStatus,
  CallStatus,
  DocumentType,
  NeedsInfoItemStatus,
  ProgramType,
} from '../../generated/prisma/enums';
import { ApplicationDetailDto } from './dto/application-detail.dto';
import { ApplicationDocumentDto } from './dto/application-document.dto';
import { ApplicationEvaluationDto } from './dto/application-evaluation.dto';
import { ApplicationStatusEventDto } from './dto/application-status-event.dto';
import { InternalProgramAApplicationDto } from '../programs/program-a/dto/internal-program-a-application.dto';
import { MentorshipNoteAuthorDto } from './dto/mentorship-note-author.dto';
import { NeedsInfoItemDto } from './dto/needs-info-item.dto';
import { NeedsInfoReplyDto } from './dto/needs-info-reply.dto';
import { ProgramAMentorshipNoteDto } from '../programs/program-a/dto/program-a-mentorship-note.dto';
import { ProgramAMilestoneDto } from '../programs/program-a/dto/program-a-milestone.dto';
import { PublicCallDto } from './dto/public-call.dto';
import { ApplicationDocumentsRepository } from './documents/application-documents.repository';
import { ApplicationEvaluationWithScores } from './evaluations/application-evaluations.repository';
import { ApplicationWithRelations } from './applications.repository';
import { ProgramAMentorshipNoteWithAuthor } from '../programs/program-a/program-a-mentorship.repository';
import { ProgramAMilestoneWithApplication } from '../programs/program-a/program-a-milestones.repository';
import { StudentApplicationSummaryDto } from './dto/student-application-summary.dto';

export function toDetailDto(
  application: ApplicationWithRelations,
): ApplicationDetailDto {
  return {
    id: application.id,
    callId: application.callId,
    teamId: application.teamId,
    createdById: application.createdById,
    status: application.status,
    submittedAt: application.submittedAt,
    decidedAt: application.decidedAt,
    decisionById: application.decisionById,
    decisionRationale: application.decisionRationale,
    grantBudget: application.grantBudget,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
  };
}

export function parseNumericConfig(
  value: string | null | undefined,
): number | undefined {
  if (value == null || value.trim() === '') {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

export function toPublicCallDto(call: {
  id: string;
  title: string;
  type: ProgramType;
  status: CallStatus;
  opensAt: Date | null;
  closesAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  requiredDocumentTypes?: Array<{
    id: string;
    documentType: DocumentType;
    isRequired: boolean;
  }>;
  eligibilityRuleConfigs?: Array<{
    code: string;
    threshold: string | null;
  }>;
  programACategories?: Array<{
    value: string;
    label: string;
  }>;
  programAStackTags?: Array<{
    value: string;
    label: string;
  }>;
}): PublicCallDto {
  const eligibilityRuleConfigs = call.eligibilityRuleConfigs ?? [];

  return {
    id: call.id,
    title: call.title,
    type: call.type,
    status: call.status,
    opensAt: call.opensAt,
    closesAt: call.closesAt,
    requiredDocumentTypes: (call.requiredDocumentTypes ?? []).map(
      (document) => ({
        id: document.id,
        documentType: document.documentType,
        isRequired: document.isRequired,
      }),
    ),
    minTeamSize:
      parseNumericConfig(
        eligibilityRuleConfigs.find((config) => config.code === 'TEAM_SIZE_MIN')
          ?.threshold,
      ) ?? null,
    maxTransferredSubjects:
      parseNumericConfig(
        eligibilityRuleConfigs.find(
          (config) => config.code === 'TRANSFERRED_SUBJECTS_MAX',
        )?.threshold,
      ) ?? null,
    maxProfileSubjectsAverage:
      parseNumericConfig(
        eligibilityRuleConfigs.find(
          (config) => config.code === 'PROFILE_SUBJECTS_AVERAGE_MAX',
        )?.threshold,
      ) ?? null,
    categories: (call.programACategories ?? []).map((category) => ({
      value: category.value,
      label: category.label,
    })),
    stackTags: (call.programAStackTags ?? []).map((stackTag) => ({
      value: stackTag.value,
      label: stackTag.label,
    })),
    createdAt: call.createdAt,
    updatedAt: call.updatedAt,
  };
}

export function toApplicationDocumentDto(
  document: Awaited<
    ReturnType<ApplicationDocumentsRepository['createVersioned']>
  >,
): ApplicationDocumentDto {
  return {
    id: document.id,
    applicationId: document.applicationId,
    documentType: document.documentType,
    documentScope: document.documentScope,
    memberUserId: document.memberUserId,
    uploadedFileId: document.uploadedFileId,
    version: document.version,
    isActive: document.isActive,
    originalName: document.uploadedFile.originalName,
    mimeType: document.uploadedFile.mimeType,
    size: document.uploadedFile.size,
    visibility: document.uploadedFile.visibility,
    uploadStatus: document.uploadedFile.status,
    uploadedFileOwnerId: document.uploadedFile.ownerId,
    createdAt: document.createdAt,
  };
}

export function toApplicationEvaluationDto(
  evaluation: ApplicationEvaluationWithScores,
): ApplicationEvaluationDto {
  return {
    id: evaluation.id,
    applicationId: evaluation.applicationId,
    evaluatorId: evaluation.evaluatorId,
    recommendation: evaluation.recommendation,
    comment: evaluation.comment,
    scores: evaluation.scores.map((score) => ({
      id: score.id,
      evaluationId: score.evaluationId,
      criterionCode: score.criterionCode,
      score: score.score.toString(),
      comment: score.comment,
    })),
    createdAt: evaluation.createdAt,
    updatedAt: evaluation.updatedAt,
  };
}

export function toStudentApplicationSummaryDto(application: {
  id: string;
  callId: string;
  teamId: string;
  status: ApplicationStatus;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  call: {
    id: string;
    title: string;
    type: ProgramType;
    status: CallStatus;
  };
}): StudentApplicationSummaryDto {
  return {
    id: application.id,
    callId: application.callId,
    teamId: application.teamId,
    status: application.status,
    submittedAt: application.submittedAt,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
    call: {
      id: application.call.id,
      title: application.call.title,
      type: application.call.type,
      status: application.call.status,
    },
  };
}

export function toNeedsInfoReplyDto(reply: {
  id: string;
  needsInfoItemId: string;
  message: string;
  createdById: string;
  createdAt: Date;
}): NeedsInfoReplyDto {
  return {
    id: reply.id,
    needsInfoItemId: reply.needsInfoItemId,
    message: reply.message,
    createdById: reply.createdById,
    createdAt: reply.createdAt,
  };
}

export function toNeedsInfoItemDto(item: {
  id: string;
  applicationId: string;
  message: string;
  dueAt: Date | null;
  status: NeedsInfoItemStatus;
  createdById: string;
  resolvedAt: Date | null;
  resolvedById: string | null;
  createdAt: Date;
  replies?: {
    id: string;
    needsInfoItemId: string;
    message: string;
    createdById: string;
    createdAt: Date;
  }[];
}): NeedsInfoItemDto {
  return {
    id: item.id,
    applicationId: item.applicationId,
    message: item.message,
    dueAt: item.dueAt,
    status: item.status,
    createdById: item.createdById,
    resolvedAt: item.resolvedAt,
    resolvedById: item.resolvedById,
    createdAt: item.createdAt,
    replies: (item.replies ?? []).map((reply) => toNeedsInfoReplyDto(reply)),
  };
}

export function toApplicationStatusEventDto(event: {
  id: string;
  applicationId: string;
  fromStatus: ApplicationStatus;
  toStatus: ApplicationStatus;
  changedById: string;
  reason: string | null;
  needsInfoItemId: string | null;
  createdAt: Date;
}): ApplicationStatusEventDto {
  return {
    id: event.id,
    applicationId: event.applicationId,
    fromStatus: event.fromStatus,
    toStatus: event.toStatus,
    changedById: event.changedById,
    reason: event.reason,
    needsInfoItemId: event.needsInfoItemId,
    createdAt: event.createdAt,
  };
}

export function toProgramAMentorshipNoteDto(
  note: ProgramAMentorshipNoteWithAuthor,
): ProgramAMentorshipNoteDto {
  return {
    id: note.id,
    applicationId: note.applicationId,
    content: note.content,
    createdAt: note.createdAt,
    author: toMentorshipNoteAuthorDto(note.author),
  };
}

export function toProgramAMilestoneDto(
  milestone: ProgramAMilestoneWithApplication,
): ProgramAMilestoneDto {
  return {
    id: milestone.id,
    applicationId: milestone.applicationId,
    title: milestone.title,
    description: milestone.description,
    dueAt: milestone.dueAt,
    status: milestone.status,
    progressNote: milestone.progressNote,
    createdAt: milestone.createdAt,
    updatedAt: milestone.updatedAt,
  };
}

export function toInternalProgramAApplicationDto(application: {
  id: string;
  status: ApplicationStatus;
  submittedAt: Date | null;
  decidedAt: Date | null;
  mentorUserId: string | null;
  mentorAssignedAt: Date | null;
  mentorAssignedById: string | null;
  createdAt: Date;
  updatedAt: Date;
  team: {
    id: string;
    name: string;
    leaderId: string;
  };
  call: {
    id: string;
    title: string;
    type: ProgramType;
    status: CallStatus;
    opensAt: Date | null;
    closesAt: Date | null;
  };
  eligibilitySignals: Array<{
    id: string;
    code: string;
    passed: boolean;
    reason: string | null;
  }>;
}): InternalProgramAApplicationDto {
  return {
    id: application.id,
    status: application.status,
    submittedAt: application.submittedAt,
    decidedAt: application.decidedAt,
    team: application.team,
    call: application.call,
    mentorAssignment: {
      mentorUserId: application.mentorUserId,
      mentorAssignedAt: application.mentorAssignedAt,
      mentorAssignedById: application.mentorAssignedById,
    },
    eligibilitySignalSummary: {
      total: application.eligibilitySignals.length,
      passed: application.eligibilitySignals.filter((signal) => signal.passed)
        .length,
      failed: application.eligibilitySignals.filter((signal) => !signal.passed)
        .length,
    },
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
  };
}

export function toMentorshipNoteAuthorDto(author: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}): MentorshipNoteAuthorDto {
  return {
    id: author.id,
    email: author.email,
    firstName: author.firstName,
    lastName: author.lastName,
  };
}
