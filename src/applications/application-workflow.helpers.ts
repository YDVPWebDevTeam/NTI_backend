import { NotFoundException } from '@nestjs/common';
import {
  ApplicationWithRelations,
  ApplicationsRepository,
  ApplicationWorkflowView,
} from './applications.repository';

export async function loadWorkflowApplicationOrThrow(
  repository: ApplicationsRepository,
  applicationId: string,
  db?: Parameters<ApplicationsRepository['findByIdForWorkflow']>[1],
): Promise<ApplicationWorkflowView> {
  const application = await repository.findByIdForWorkflow(applicationId, db);

  if (!application) {
    throw new NotFoundException('Application not found');
  }

  return application;
}

export function getApplicationRecipientEmails(
  application: ApplicationWithRelations | ApplicationWorkflowView,
): string[] {
  const members = application.team.members as Array<{
    user?: { email?: string | null } | null;
  }>;

  return [
    ...new Set(
      members
        .map((member) => member.user?.email)
        .filter((email): email is string => Boolean(email)),
    ),
  ];
}
