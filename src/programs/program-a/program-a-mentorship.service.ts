import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApplicationStatus, UserRole } from '../../../generated/prisma/enums';
import { ensureAdminRole } from '../../auth/admin-role.helper';
import type { AuthenticatedUserContext } from '../../common/types/auth-user-context.type';
import { UserRepository } from '../../user/user.repository';
import { EMAIL_JOBS, QueueService } from '../../infrastructure/queue';
import { ApplicationAccessService } from '../../applications/application-access.service';
import {
  ApplicationsRepository,
  ApplicationWorkflowView,
} from '../../applications/applications.repository';
import { ProgramAMentorshipRepository } from './program-a-mentorship.repository';
import {
  getApplicationRecipientEmails,
  loadWorkflowApplicationOrThrow,
} from '../../applications/application-workflow.helpers';
import { toProgramAMentorshipNoteDto } from '../../applications/application.mappers';
import { AssignMentorDto } from '../../applications/dto/assign-mentor.dto';
import { CreateMentorshipNoteDto } from '../../applications/dto/create-mentorship-note.dto';
import { MentorAssignmentDto } from '../../applications/dto/mentor-assignment.dto';
import { ProgramAMentorshipNoteDto } from './dto/program-a-mentorship-note.dto';
import { APPLICATIONS_MESSAGES } from '../../applications/applications.messages';

const MENTORSHIP_ASSIGNABLE_STATUSES: readonly ApplicationStatus[] = [
  ApplicationStatus.APPROVED,
  ApplicationStatus.ONBOARDING,
  ApplicationStatus.ACTIVE_PROJECT,
  ApplicationStatus.PAUSED,
  ApplicationStatus.COMPLETED,
];

@Injectable()
export class ProgramAMentorshipService {
  constructor(
    private readonly applicationsRepository: ApplicationsRepository,
    private readonly programAMentorshipRepository: ProgramAMentorshipRepository,
    private readonly userRepository: UserRepository,
    private readonly queueService: QueueService,
    private readonly applicationAccess: ApplicationAccessService,
  ) {}

  async assignMentor(
    applicationId: string,
    user: AuthenticatedUserContext,
    dto: AssignMentorDto,
  ): Promise<MentorAssignmentDto> {
    ensureAdminRole(user.role, 'Only administrators can assign mentors');

    const result = await this.applicationsRepository.transaction(async (db) => {
      const application = await loadWorkflowApplicationOrThrow(
        this.applicationsRepository,
        applicationId,
        db,
      );

      this.applicationAccess.ensureProgramAMentorshipWorkflow(application);

      if (!MENTORSHIP_ASSIGNABLE_STATUSES.includes(application.status)) {
        throw new BadRequestException(
          `Mentor assignment is not allowed for application status ${application.status}`,
        );
      }

      const mentor = await this.userRepository.findUnique(
        { id: dto.mentorUserId },
        db,
      );

      if (!mentor) {
        throw new NotFoundException(
          APPLICATIONS_MESSAGES.MENTOR_USER_NOT_FOUND,
        );
      }

      if (mentor.role !== UserRole.MENTOR) {
        throw new BadRequestException(
          APPLICATIONS_MESSAGES.MENTOR_ROLE_REQUIRED,
        );
      }

      const assignedAt = new Date();
      const assignment = await this.applicationsRepository.assignMentor(
        application.id,
        mentor.id,
        assignedAt,
        user.id,
        db,
      );

      return {
        assignment: {
          applicationId: assignment.id,
          mentorUserId: assignment.mentorUserId ?? mentor.id,
          assignedAt: assignment.mentorAssignedAt ?? assignedAt,
          assignedById: assignment.mentorAssignedById ?? user.id,
        },
        application,
        mentorEmail: mentor.email,
      };
    });

    await this.enqueueMentorAssignmentEmail(
      result.application,
      result.mentorEmail,
    );

    return result.assignment;
  }

  async createMentorshipNote(
    applicationId: string,
    user: AuthenticatedUserContext,
    dto: CreateMentorshipNoteDto,
  ): Promise<ProgramAMentorshipNoteDto> {
    return this.applicationsRepository.transaction(async (db) => {
      const application = await loadWorkflowApplicationOrThrow(
        this.applicationsRepository,
        applicationId,
        db,
      );

      this.applicationAccess.ensureProgramAMentorshipWorkflow(application);
      this.applicationAccess.ensureMentorAssigned(application);
      this.applicationAccess.ensureMentorshipAccess(application, user);
      this.applicationAccess.ensureArchivedApplicationIsReadOnlyForNonAdmin(
        application,
        user,
      );

      const note = await this.programAMentorshipRepository.createNote(
        {
          applicationId: application.id,
          authorId: user.id,
          content: dto.content,
        },
        db,
      );

      return toProgramAMentorshipNoteDto(note);
    });
  }

  async listMentorshipNotes(
    applicationId: string,
    user: AuthenticatedUserContext,
  ): Promise<ProgramAMentorshipNoteDto[]> {
    const application = await loadWorkflowApplicationOrThrow(
      this.applicationsRepository,
      applicationId,
    );

    this.applicationAccess.ensureProgramAMentorshipWorkflow(application);
    this.applicationAccess.ensureMentorAssigned(application);
    this.applicationAccess.ensureMentorshipAccess(application, user);

    const notes = await this.programAMentorshipRepository.listNotes(
      application.id,
    );

    return notes.map((note) => toProgramAMentorshipNoteDto(note));
  }

  private async enqueueMentorAssignmentEmail(
    application: ApplicationWorkflowView,
    mentorEmail: string,
  ): Promise<void> {
    const recipientEmails = [
      ...new Set([mentorEmail, ...getApplicationRecipientEmails(application)]),
    ];

    if (recipientEmails.length === 0) {
      return;
    }

    await Promise.all(
      recipientEmails.map((email) =>
        this.queueService.addEmail(EMAIL_JOBS.APPLICATION_MENTOR_ASSIGNED, {
          email,
          applicationId: application.id,
          applicationTitle: application.call.title,
        }),
      ),
    );
  }
}
