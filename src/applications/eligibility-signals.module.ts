import { Module } from '@nestjs/common';
import { ApplicationsRepository } from './applications.repository';
import { EligibilitySignalsRepository } from './eligibility-signals.repository';
import { EligibilitySignalsService } from './eligibility-signals.service';

@Module({
  providers: [
    ApplicationsRepository,
    EligibilitySignalsRepository,
    EligibilitySignalsService,
  ],
  exports: [EligibilitySignalsService],
})
export class EligibilitySignalsModule {}
