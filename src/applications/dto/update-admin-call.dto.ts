import { PartialType } from '@nestjs/swagger';
import { CreateAdminCallDto } from './create-admin-call.dto';

export class UpdateAdminCallDto extends PartialType(CreateAdminCallDto) {}
