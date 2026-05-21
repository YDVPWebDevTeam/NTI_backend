import type { ApplicationIdeaOverviewSectionValue } from './application-idea-overview-section-value.dto';
import { type ApplicationProfileSectionValue } from './application-profile-section-value.dto';

export type ApplicationSectionValue =
  | ApplicationProfileSectionValue
  | ApplicationIdeaOverviewSectionValue;

export class UpsertApplicationSectionDto {
  valueJson!: ApplicationSectionValue;
}
