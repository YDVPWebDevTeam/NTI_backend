import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApplicationStatus,
  ConversationChannel,
  ProgramBProjectStatus,
  ProgramType,
  UserRole,
  UserStatus,
} from 'generated/prisma/enums';
import {
  isAdminRole,
  isCompanyRole,
  isReviewerRole,
  isSameOrgCompanyMember,
  isTeamMember,
} from '../common/auth/role-groups';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import { CONVERSATIONS_MESSAGES } from './conversations.messages';
import type {
  ApplicationAnchorView,
  ProgramBProjectAnchorView,
} from './conversations.repository';

/**
 * Resolves which conversation channels a user may read/write for a given anchor,
 * and enforces the hard rule that client-company users never reach INTERNAL.
 */
@Injectable()
export class ConversationAccessService {
  /** Channels that actually exist for a Program B project anchor. */
  programBChannels(): ConversationChannel[] {
    return [ConversationChannel.PARTICIPANTS, ConversationChannel.INTERNAL];
  }

  /** Channels that actually exist for a Program A application anchor. */
  programAChannels(): ConversationChannel[] {
    return [ConversationChannel.INTERNAL];
  }

  /** Channels (of those that exist) the user may currently read. */
  listReadableProgramBChannels(
    project: ProgramBProjectAnchorView,
    user: AuthenticatedUserContext,
  ): ConversationChannel[] {
    return this.programBChannels().filter((channel) =>
      this.canReadProgramB(project, channel, user),
    );
  }

  listReadableProgramAChannels(
    application: ApplicationAnchorView,
    user: AuthenticatedUserContext,
  ): ConversationChannel[] {
    return this.programAChannels().filter((channel) =>
      this.canReadProgramA(application, channel, user),
    );
  }

  assertProgramBChannelReadable(
    project: ProgramBProjectAnchorView,
    channel: ConversationChannel,
    user: AuthenticatedUserContext,
  ): void {
    this.ensureActive(user);

    if (this.canReadProgramB(project, channel, user)) {
      return;
    }

    this.throwForChannelDenied(channel, user);
  }

  assertProgramBChannelWritable(
    project: ProgramBProjectAnchorView,
    channel: ConversationChannel,
    user: AuthenticatedUserContext,
  ): void {
    this.assertProgramBChannelReadable(project, channel, user);

    if (
      project.status === ProgramBProjectStatus.CLOSED &&
      !isAdminRole(user.role)
    ) {
      throw new ConflictException(CONVERSATIONS_MESSAGES.CHANNEL_READ_ONLY);
    }
  }

  assertProgramAChannelReadable(
    application: ApplicationAnchorView,
    channel: ConversationChannel,
    user: AuthenticatedUserContext,
  ): void {
    this.ensureActive(user);
    this.ensureProgramAApplication(application);
    this.ensureProgramAChannelExists(channel);

    if (this.canReadProgramA(application, channel, user)) {
      return;
    }

    this.throwForChannelDenied(channel, user);
  }

  assertProgramAChannelWritable(
    application: ApplicationAnchorView,
    channel: ConversationChannel,
    user: AuthenticatedUserContext,
  ): void {
    this.assertProgramAChannelReadable(application, channel, user);

    if (
      application.status === ApplicationStatus.ARCHIVED &&
      !isAdminRole(user.role)
    ) {
      throw new ConflictException(CONVERSATIONS_MESSAGES.CHANNEL_READ_ONLY);
    }
  }

  private canReadProgramB(
    project: ProgramBProjectAnchorView,
    channel: ConversationChannel,
    user: AuthenticatedUserContext,
  ): boolean {
    const isInternalMember = this.isProgramBInternalMember(project, user);

    if (channel === ConversationChannel.INTERNAL) {
      return isInternalMember;
    }

    // PARTICIPANTS
    return isInternalMember || this.isProgramBClientMember(project, user);
  }

  private canReadProgramA(
    application: ApplicationAnchorView,
    channel: ConversationChannel,
    user: AuthenticatedUserContext,
  ): boolean {
    if (channel !== ConversationChannel.INTERNAL) {
      return false;
    }

    if (isReviewerRole(user.role)) {
      return true;
    }

    if (
      user.role === UserRole.MENTOR &&
      application.mentorUserId !== null &&
      application.mentorUserId === user.id
    ) {
      return true;
    }

    return isTeamMember(application.team, user.id);
  }

  private isProgramBInternalMember(
    project: ProgramBProjectAnchorView,
    user: AuthenticatedUserContext,
  ): boolean {
    if (isReviewerRole(user.role)) {
      return true;
    }

    if (
      user.role === UserRole.MENTOR &&
      project.mentorUserId !== null &&
      project.mentorUserId === user.id
    ) {
      return true;
    }

    return isTeamMember(project.team, user.id);
  }

  private isProgramBClientMember(
    project: ProgramBProjectAnchorView,
    user: AuthenticatedUserContext,
  ): boolean {
    if (project.productOwnerUserId === user.id) {
      return true;
    }

    return isSameOrgCompanyMember(user, project.backlogItem.organizationId);
  }

  private ensureActive(user: AuthenticatedUserContext): void {
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException();
    }
  }

  private ensureProgramAApplication(application: ApplicationAnchorView): void {
    if (application.call.type !== ProgramType.PROGRAM_A) {
      throw new NotFoundException(
        CONVERSATIONS_MESSAGES.CONVERSATION_CHANNEL_NOT_FOUND,
      );
    }
  }

  private ensureProgramAChannelExists(channel: ConversationChannel): void {
    if (channel !== ConversationChannel.INTERNAL) {
      throw new NotFoundException(
        CONVERSATIONS_MESSAGES.PROGRAM_A_HAS_NO_PARTICIPANTS_CHANNEL,
      );
    }
  }

  /**
   * Denial response. For company users hitting INTERNAL we return 404 rather
   * than 403 so the existence of the private channel is never disclosed.
   */
  private throwForChannelDenied(
    channel: ConversationChannel,
    user: AuthenticatedUserContext,
  ): never {
    if (channel === ConversationChannel.INTERNAL && isCompanyRole(user.role)) {
      throw new NotFoundException(
        CONVERSATIONS_MESSAGES.CONVERSATION_CHANNEL_NOT_FOUND,
      );
    }

    throw new ForbiddenException(CONVERSATIONS_MESSAGES.NO_ACCESS_TO_CHANNEL);
  }
}
