import { PartialType } from '@nestjs/swagger';
import { CreateProgramBBacklogItemDto } from './create-program-b-backlog-item.dto';

export class UpdateProgramBBacklogItemDto extends PartialType(
  CreateProgramBBacklogItemDto,
) {}
