import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '../../generated/prisma/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  CreateContactSubmissionApi,
  ListContactSubmissionsApi,
  UpdateContactStatusApi,
} from './api-docs/contact-api-docs.decorators';
import { ContactService } from './contact.service';
import { ContactSubmissionDto } from './dto/contact-submission.dto';
import { CreateContactSubmissionDto } from './dto/create-contact-submission.dto';
import { UpdateContactStatusDto } from './dto/update-contact-status.dto';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @CreateContactSubmissionApi()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateContactSubmissionDto,
  ): Promise<ContactSubmissionDto> {
    return this.contactService.create(dto);
  }

  @ListContactSubmissionsApi()
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findAll(): Promise<ContactSubmissionDto[]> {
    return this.contactService.findAll();
  }

  @UpdateContactStatusApi()
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactStatusDto,
  ): Promise<ContactSubmissionDto> {
    return this.contactService.updateStatus(id, dto);
  }
}
