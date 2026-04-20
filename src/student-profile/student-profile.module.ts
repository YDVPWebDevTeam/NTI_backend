import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AcademicStructureController } from './academic-structure/academic-structure.controller';
import { AcademicStructureRepository } from './academic-structure/academic-structure.repository';
import { AcademicStructureService } from './academic-structure/academic-structure.service';
import { StudentProfileController } from './student-profile.controller';
import { StudentProfileRepository } from './student-profile.repository';
import { StudentProfileService } from './student-profile.service';

@Module({
  imports: [AuthModule],
  controllers: [StudentProfileController, AcademicStructureController],
  providers: [
    RolesGuard,
    StudentProfileService,
    StudentProfileRepository,
    AcademicStructureService,
    AcademicStructureRepository,
  ],
})
export class StudentProfileModule {}
