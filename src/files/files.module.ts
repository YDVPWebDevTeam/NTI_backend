import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../infrastructure/storage';
import { FilesController } from './files.controller';
import { FilesRepository } from './files.repository';
import { FilesService } from './files.service';

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [FilesController],
  providers: [FilesRepository, FilesService],
  exports: [FilesRepository, FilesService],
})
export class FilesModule {}
