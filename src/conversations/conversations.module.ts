import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FilesModule } from '../files';
import { StorageModule } from '../infrastructure/storage';
import { ConversationAccessService } from './conversation-access.service';
import { ConversationsController } from './conversations.controller';
import { ConversationsRepository } from './conversations.repository';
import { ConversationsService } from './conversations.service';

@Module({
  imports: [AuthModule, FilesModule, StorageModule],
  controllers: [ConversationsController],
  providers: [
    ConversationsService,
    ConversationAccessService,
    ConversationsRepository,
  ],
})
export class ConversationsModule {}
