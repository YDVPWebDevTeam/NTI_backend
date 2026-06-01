import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get(['', 'health'])
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'Liveness probe.',
    schema: {
      type: 'object',
      properties: { status: { type: 'string', example: 'ok' } },
    },
  })
  getHealth(): { status: 'ok' } {
    return this.appService.getHealth();
  }
}
