import { ProgramType } from '../../generated/prisma/enums';

export type PublicProgramDefinition = {
  id: ProgramType;
  code: ProgramType;
  slug: string;
  label: string;
};

export const PUBLIC_PROGRAMS: ReadonlyArray<PublicProgramDefinition> = [
  {
    id: ProgramType.PROGRAM_A,
    code: ProgramType.PROGRAM_A,
    slug: 'program-a',
    label: 'Program A',
  },
  {
    id: ProgramType.PROGRAM_B,
    code: ProgramType.PROGRAM_B,
    slug: 'program-b',
    label: 'Program B',
  },
] as const;
