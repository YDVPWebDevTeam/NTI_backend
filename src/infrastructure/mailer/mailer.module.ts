import { Global, Module } from '@nestjs/common';
import { EmailLayoutService } from './email-layout.service';
import { EmailTemplateRegistryService } from './email-template-registry.service';
import { MailerService } from './mailer.service';

@Global()
@Module({
  providers: [EmailLayoutService, EmailTemplateRegistryService, MailerService],
  exports: [MailerService],
})
export class MailerModule {}
