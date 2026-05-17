import { PartialType } from '@nestjs/swagger';
import { CreateProgramBMilestoneDto } from './create-program-b-milestone.dto';

export class UpdateProgramBMilestoneDto extends PartialType(
  CreateProgramBMilestoneDto,
) {}
