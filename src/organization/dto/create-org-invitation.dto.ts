import { IsEmail } from 'class-validator';

export class CreateOrgInviteDto {
  @IsEmail()
  email!: string;
}
