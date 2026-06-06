import { Injectable, NotFoundException } from '@nestjs/common';
import { ContactSubmissionStatus } from '../../generated/prisma/enums';
import { CreateContactSubmissionDto } from './dto/create-contact-submission.dto';
import { ContactSubmissionDto } from './dto/contact-submission.dto';
import { UpdateContactStatusDto } from './dto/update-contact-status.dto';
import { CONTACT_MESSAGES } from './contact.messages';
import { ContactRepository } from './contact.repository';

@Injectable()
export class ContactService {
  constructor(private readonly contactRepository: ContactRepository) {}

  async create(dto: CreateContactSubmissionDto): Promise<ContactSubmissionDto> {
    const submission = await this.contactRepository.create({
      name: dto.name,
      email: dto.email,
      subject: dto.subject,
      message: dto.message,
      topic: dto.topic,
      status: ContactSubmissionStatus.NEW,
    });

    return submission;
  }

  async findAll(): Promise<ContactSubmissionDto[]> {
    return this.contactRepository.findAll();
  }

  async updateStatus(
    id: string,
    dto: UpdateContactStatusDto,
  ): Promise<ContactSubmissionDto> {
    const existing = await this.contactRepository.findById(id);

    if (!existing) {
      throw new NotFoundException(CONTACT_MESSAGES.SUBMISSION_NOT_FOUND);
    }

    return this.contactRepository.update({ id }, { status: dto.status });
  }
}
