import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  ConfirmStudentEmailDto,
  StudentEmailStateDto,
} from './dto/student-email.dto';
import { StudentEmailService } from './student-email.service';

/**
 * Unauthenticated confirmation endpoint hit from the verification email link,
 * mirroring `POST /auth/confirm-email`.
 */
@ApiTags('StudentEmail')
@Controller('student-profile/student-email')
export class StudentEmailConfirmController {
  constructor(private readonly service: StudentEmailService) {}

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  confirm(@Body() dto: ConfirmStudentEmailDto): Promise<StudentEmailStateDto> {
    return this.service.confirm(dto.token);
  }
}
