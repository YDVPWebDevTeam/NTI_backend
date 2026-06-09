import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '../../generated/prisma/enums';
import { GetUserContext } from '../auth/decorators/get-user-context.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUserContext } from '../common/types/auth-user-context.type';
import {
  SetStudentEmailDto,
  StudentEmailStateDto,
} from './dto/student-email.dto';
import { StudentEmailService } from './student-email.service';

@ApiTags('StudentEmail')
@Controller('student-profile/me/student-email')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class StudentEmailController {
  constructor(private readonly service: StudentEmailService) {}

  @Patch()
  setStudentEmail(
    @GetUserContext() authUser: AuthenticatedUserContext,
    @Body() dto: SetStudentEmailDto,
  ): Promise<StudentEmailStateDto> {
    return this.service.setStudentEmail(authUser, dto.studentEmail);
  }

  @Post('resend')
  @HttpCode(HttpStatus.OK)
  resend(
    @GetUserContext() authUser: AuthenticatedUserContext,
  ): Promise<StudentEmailStateDto> {
    return this.service.resend(authUser);
  }
}
