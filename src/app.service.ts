import { Injectable } from '@nestjs/common';
import { MailerService } from './infrastructure/mailer/mailer.service';

//on_module_init only for testing purposes
@Injectable()
export class AppService {
  constructor(private readonly mailer: MailerService) {}

  getHello(): string {
    return 'Hello World!';
  }
}
