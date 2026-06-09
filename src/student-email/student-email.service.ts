import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import { isPrismaUniqueConstraintError } from '../common/prisma/prisma-error.utils';
import { EMAIL_JOBS, QueueService } from '../infrastructure/queue';
import { UniversityEmailDomainService } from '../university-email-domain/university-email-domain.service';
import { UserService } from '../user/user.service';
import { StudentEmailStateDto } from './dto/student-email.dto';
import {
  STUDENT_EMAIL_DOMAIN_NOT_ALLOWED_CODE,
  STUDENT_EMAIL_MESSAGES,
} from './student-email.messages';
import { StudentEmailVerificationService } from './student-email-verification.service';

@Injectable()
export class StudentEmailService {
  constructor(
    private readonly userService: UserService,
    private readonly verificationService: StudentEmailVerificationService,
    private readonly domainService: UniversityEmailDomainService,
    private readonly queueService: QueueService,
  ) {}

  async setStudentEmail(
    authUser: AuthenticatedUserContext,
    studentEmail: string,
  ): Promise<StudentEmailStateDto> {
    const normalizedEmail = studentEmail.trim().toLowerCase();
    const isApproved =
      await this.domainService.isApprovedDomain(normalizedEmail);

    if (!isApproved) {
      throw new UnprocessableEntityException({
        message: STUDENT_EMAIL_MESSAGES.DOMAIN_NOT_ALLOWED,
        code: STUDENT_EMAIL_DOMAIN_NOT_ALLOWED_CODE,
        domain: this.domainService.normalizeDomain(normalizedEmail),
      });
    }

    const token = await this.userService.transaction(async (db) => {
      try {
        await this.userService.update(
          authUser.id,
          { studentEmail: normalizedEmail, isStudentEmailConfirmed: false },
          db,
        );
      } catch (error) {
        if (isPrismaUniqueConstraintError(error)) {
          throw new ConflictException(
            STUDENT_EMAIL_MESSAGES.EMAIL_ALREADY_IN_USE,
          );
        }
        throw error;
      }

      return this.verificationService.createForUser(
        authUser.id,
        normalizedEmail,
        db,
      );
    });

    await this.queueService.addEmail(EMAIL_JOBS.STUDENT_EMAIL_VERIFICATION, {
      email: normalizedEmail,
      token: token.token,
    });

    return { studentEmail: normalizedEmail, isStudentEmailConfirmed: false };
  }

  async resend(
    authUser: AuthenticatedUserContext,
  ): Promise<StudentEmailStateDto> {
    const user = await this.userService.findById(authUser.id);

    if (!user) {
      throw new NotFoundException(STUDENT_EMAIL_MESSAGES.USER_NOT_FOUND);
    }

    if (!user.studentEmail) {
      throw new UnprocessableEntityException(
        STUDENT_EMAIL_MESSAGES.NO_STUDENT_EMAIL,
      );
    }

    if (user.isStudentEmailConfirmed) {
      throw new ConflictException(STUDENT_EMAIL_MESSAGES.ALREADY_CONFIRMED);
    }

    const token = await this.verificationService.createForUser(
      user.id,
      user.studentEmail,
    );

    await this.queueService.addEmail(EMAIL_JOBS.STUDENT_EMAIL_VERIFICATION, {
      email: user.studentEmail,
      token: token.token,
    });

    return {
      studentEmail: user.studentEmail,
      isStudentEmailConfirmed: false,
    };
  }

  async confirm(token: string): Promise<StudentEmailStateDto> {
    const verificationToken =
      await this.verificationService.validateTokenOrThrow(token);

    const user = await this.userService.transaction(async (db) => {
      const updated = await this.userService.update(
        verificationToken.userId,
        {
          studentEmail: verificationToken.email,
          isStudentEmailConfirmed: true,
        },
        db,
      );
      await this.verificationService.markAccepted(verificationToken.id, db);
      return updated;
    });

    return {
      studentEmail: user.studentEmail,
      isStudentEmailConfirmed: user.isStudentEmailConfirmed,
    };
  }
}
