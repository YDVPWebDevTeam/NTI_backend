import { ApiProperty } from '@nestjs/swagger';
import { UploadedFileDto } from './uploaded-file.dto';

export class ListMyFilesDemoDto {
  @ApiProperty({
    description: 'Recent files that belong to the authenticated user.',
    type: UploadedFileDto,
    isArray: true,
  })
  items!: UploadedFileDto[];

  @ApiProperty({
    description: 'Number of returned items in this demo response.',
    example: 2,
  })
  total!: number;
}
