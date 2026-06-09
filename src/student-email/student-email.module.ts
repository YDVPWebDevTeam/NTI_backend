import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { HashingModule } from '../infrastructure/hashing';
import { UniversityEmailDomainModule } from '../university-email-domain/university-email-domain.module';
import { UserModule } from '../user/user.module';
import { StudentEmailConfirmController } from './student-email-confirm.controller';
import { StudentEmailController } from './student-email.controller';
import { StudentEmailService } from './student-email.service';
import { StudentEmailVerificationRepository } from './student-email-verification.repository';
import { StudentEmailVerificationService } from './student-email-verification.service';

@Module({
  imports: [AuthModule, UserModule, HashingModule, UniversityEmailDomainModule],
  controllers: [StudentEmailController, StudentEmailConfirmController],
  providers: [
    StudentEmailService,
    StudentEmailVerificationService,
    StudentEmailVerificationRepository,
  ],
})
export class StudentEmailModule {}
