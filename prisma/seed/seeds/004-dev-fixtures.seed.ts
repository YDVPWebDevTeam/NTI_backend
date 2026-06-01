import { randomUUID } from 'node:crypto';
import type { SeedTask } from '../types';

const DEV_PASSWORD = 'Dev1234!';

// ---------------------------------------------------------------------------
// Deterministic IDs so re-runs stay idempotent
// ---------------------------------------------------------------------------
const IDS = {
  // Universities
  univSTU: randomUUID(),
  univUK: randomUUID(),
  univEKON: randomUUID(),

  // Faculties
  facFEI: randomUUID(),
  facFIIT: randomUUID(),
  facMFF: randomUUID(),
  facNHF: randomUUID(),

  // Specializations
  specSoftEng: randomUUID(),
  specAI: randomUUID(),
  specCS: randomUUID(),
  specFinance: randomUUID(),

  // Organizations
  orgTechNova: randomUUID(),
  orgGreenSolutions: randomUUID(),
  orgDataDriven: randomUUID(),
  orgStartupXYZ: randomUUID(),

  // System users
  admin1: randomUUID(),
  admin2: randomUUID(),
  mentor1: randomUUID(),
  mentor2: randomUUID(),
  mentor3: randomUUID(),
  evaluator1: randomUUID(),
  evaluator2: randomUUID(),
  editor1: randomUUID(),

  // Company owners/employees
  ownerTechNova: randomUUID(),
  empTechNova: randomUUID(),
  ownerGreen: randomUUID(),
  ownerData: randomUUID(),
  ownerStartup: randomUUID(),

  // Students
  student01: randomUUID(),
  student02: randomUUID(),
  student03: randomUUID(),
  student04: randomUUID(),
  student05: randomUUID(),
  student06: randomUUID(),
  student07: randomUUID(),
  student08: randomUUID(),
  student09: randomUUID(),
  student10: randomUUID(),
  student11: randomUUID(),
  student12: randomUUID(),
  student13: randomUUID(),
  student14: randomUUID(),
  student15: randomUUID(),

  // Student profiles
  sp01: randomUUID(),
  sp02: randomUUID(),
  sp03: randomUUID(),
  sp04: randomUUID(),
  sp05: randomUUID(),
  sp06: randomUUID(),
  sp07: randomUUID(),
  sp08: randomUUID(),
  sp09: randomUUID(),
  sp10: randomUUID(),
  sp11: randomUUID(),
  sp12: randomUUID(),
  sp13: randomUUID(),
  sp14: randomUUID(),
  sp15: randomUUID(),

  // Teams
  teamAlpha: randomUUID(),
  teamBeta: randomUUID(),
  teamGamma: randomUUID(),
  teamDelta: randomUUID(),
  teamEpsilon: randomUUID(),

  // Backlog items
  backlog01: randomUUID(),
  backlog02: randomUUID(),
  backlog03: randomUUID(),
  backlog04: randomUUID(),
  backlog05: randomUUID(),
  backlog06: randomUUID(),
  backlog07: randomUUID(),
  backlog08: randomUUID(),
  backlog09: randomUUID(),

  // Program B team applications
  pbApp01: randomUUID(),
  pbApp02: randomUUID(),
  pbApp03: randomUUID(),
  pbApp04: randomUUID(),
  pbApp05: randomUUID(),

  // Program B projects
  pbProject01: randomUUID(),
  pbProject02: randomUUID(),

  // Program A applications
  paApp01: randomUUID(),
  paApp02: randomUUID(),
  paApp03: randomUUID(),
  paApp04: randomUUID(),
  paApp05: randomUUID(),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function upsertUser(
  client: {
    query: (
      sql: string,
      params?: unknown[],
    ) => Promise<{ rowCount: number | null }>;
  },
  id: string,
  fields: {
    firstName: string;
    lastName: string;
    email: string;
    passwordHash: string;
    role: string;
    status?: string;
    isConfirmed?: boolean;
    isAdminConfirmed?: boolean;
    mustChangePassword?: boolean;
    organizationId?: string | null;
    now: Date;
  },
): Promise<void> {
  await client.query(
    `INSERT INTO "User" (
      id, "firstName", "lastName", email, "passwordHash", role, status,
      "isConfirmed", "isAdminConfirmed", "mustChangePassword", "organizationId",
      "createdAt", "updatedAt"
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    ON CONFLICT (email) DO NOTHING`,
    [
      id,
      fields.firstName,
      fields.lastName,
      fields.email,
      fields.passwordHash,
      fields.role,
      fields.status ?? 'ACTIVE',
      fields.isConfirmed ?? true,
      fields.isAdminConfirmed ?? true,
      fields.mustChangePassword ?? false,
      fields.organizationId ?? null,
      fields.now,
      fields.now,
    ],
  );
}

// ---------------------------------------------------------------------------
// Main seed
// ---------------------------------------------------------------------------
export const devFixturesSeed: SeedTask = {
  name: '004-dev-fixtures',

  async run(context) {
    const { client, hashPassword, now: getNow } = context;
    const now = getNow();

    // Skip if already seeded
    const marker = await client.query(
      `SELECT id FROM "User" WHERE email = 'admin1@dev.local' LIMIT 1`,
    );
    if (marker.rowCount && marker.rowCount > 0) {
      return;
    }

    const pw = await hashPassword(DEV_PASSWORD);

    // -----------------------------------------------------------------------
    // Universities / Faculties / Specializations
    // -----------------------------------------------------------------------
    await client.query(
      `INSERT INTO "University" (id, name, "shortName", city, country, "isActive", "createdAt", "updatedAt")
       VALUES
         ($1, 'Slovenská technická univerzita v Bratislave', 'STU', 'Bratislava', 'sk', true, $4, $4),
         ($2, 'Univerzita Komenského v Bratislave', 'UK', 'Bratislava', 'sk', true, $4, $4),
         ($3, 'Ekonomická univerzita v Bratislave', 'EKON', 'Bratislava', 'sk', true, $4, $4)
       ON CONFLICT (name) DO NOTHING`,
      [IDS.univSTU, IDS.univUK, IDS.univEKON, now],
    );

    const univSTUId = (
      await client.query<{ id: string }>(
        `SELECT id FROM "University" WHERE "shortName" = 'STU' LIMIT 1`,
      )
    ).rows[0].id;

    const univUKId = (
      await client.query<{ id: string }>(
        `SELECT id FROM "University" WHERE "shortName" = 'UK' LIMIT 1`,
      )
    ).rows[0].id;

    const univEKONId = (
      await client.query<{ id: string }>(
        `SELECT id FROM "University" WHERE "shortName" = 'EKON' LIMIT 1`,
      )
    ).rows[0].id;

    await client.query(
      `INSERT INTO "Faculty" (id, "universityId", name, "shortName", "isActive", "createdAt", "updatedAt")
       VALUES
         ($1, $5, 'Fakulta elektrotechniky a informatiky', 'FEI', true, $9, $9),
         ($2, $5, 'Fakulta informatiky a informačných technológií', 'FIIT', true, $9, $9),
         ($3, $6, 'Fakulta matematiky, fyziky a informatiky', 'FMFI', true, $9, $9),
         ($4, $7, 'Národohospodárska fakulta', 'NHF', true, $9, $9)
       ON CONFLICT ("universityId", name) DO NOTHING`,
      [
        IDS.facFEI,
        IDS.facFIIT,
        IDS.facMFF,
        IDS.facNHF,
        univSTUId,
        univUKId,
        univEKONId,
        null,
        now,
      ],
    );

    const facFEIId = (
      await client.query<{ id: string }>(
        `SELECT id FROM "Faculty" WHERE "shortName" = 'FEI' LIMIT 1`,
      )
    ).rows[0].id;

    const facFIITId = (
      await client.query<{ id: string }>(
        `SELECT id FROM "Faculty" WHERE "shortName" = 'FIIT' LIMIT 1`,
      )
    ).rows[0].id;

    const facMFFId = (
      await client.query<{ id: string }>(
        `SELECT id FROM "Faculty" WHERE "shortName" = 'FMFI' LIMIT 1`,
      )
    ).rows[0].id;

    const facNHFId = (
      await client.query<{ id: string }>(
        `SELECT id FROM "Faculty" WHERE "shortName" = 'NHF' LIMIT 1`,
      )
    ).rows[0].id;

    await client.query(
      `INSERT INTO "Specialization" (id, "facultyId", name, code, "degreeLabel", "isActive", "createdAt", "updatedAt")
       VALUES
         ($1, $5, 'Softvérové inžinierstvo', 'SI', 'Bc./Ing.', true, $9, $9),
         ($2, $6, 'Umelá inteligencia', 'AI', 'Bc./Ing.', true, $9, $9),
         ($3, $7, 'Informatika', 'INF', 'Bc./Mgr.', true, $9, $9),
         ($4, $8, 'Financie', 'FIN', 'Bc./Ing.', true, $9, $9)
       ON CONFLICT ("facultyId", name) DO NOTHING`,
      [
        IDS.specSoftEng,
        IDS.specAI,
        IDS.specCS,
        IDS.specFinance,
        facFEIId,
        facFIITId,
        facMFFId,
        facNHFId,
        now,
      ],
    );

    const specSoftEngId = (
      await client.query<{ id: string }>(
        `SELECT id FROM "Specialization" WHERE code = 'SI' LIMIT 1`,
      )
    ).rows[0].id;

    const specAIId = (
      await client.query<{ id: string }>(
        `SELECT id FROM "Specialization" WHERE code = 'AI' LIMIT 1`,
      )
    ).rows[0].id;

    const specCSId = (
      await client.query<{ id: string }>(
        `SELECT id FROM "Specialization" WHERE code = 'INF' LIMIT 1`,
      )
    ).rows[0].id;

    const specFinanceId = (
      await client.query<{ id: string }>(
        `SELECT id FROM "Specialization" WHERE code = 'FIN' LIMIT 1`,
      )
    ).rows[0].id;

    // -----------------------------------------------------------------------
    // Organizations
    // -----------------------------------------------------------------------
    await client.query(
      `INSERT INTO "Organization" (id, name, ico, sector, description, website, status, "createdAt", "updatedAt")
       VALUES
         ($1, 'TechNova s.r.o.',       '11111111', 'Technology',  'Inovatívna softvérová spoločnosť zameraná na AI a cloud riešenia.', 'https://technova.dev', 'ACTIVE', $5, $5),
         ($2, 'GreenSolutions a.s.',   '22222222', 'Environment', 'Spoločnosť poskytujúca riešenia pre udržateľnosť a zelené technológie.', 'https://greensolutions.sk', 'ACTIVE', $5, $5),
         ($3, 'DataDriven s.r.o.',     '33333333', 'Analytics',   'Dátová analytika a business intelligence pre stredné podniky.', 'https://datadriven.sk', 'ACTIVE', $5, $5),
         ($4, 'StartupXYZ s.r.o.',     '44444444', 'Fintech',     'Fintech startup budujúci next-gen platforné riešenia.', 'https://startupxyz.io', 'ACTIVE', $5, $5)
       ON CONFLICT (ico) DO NOTHING`,
      [
        IDS.orgTechNova,
        IDS.orgGreenSolutions,
        IDS.orgDataDriven,
        IDS.orgStartupXYZ,
        now,
      ],
    );

    const orgTechNovaId = (
      await client.query<{ id: string }>(
        `SELECT id FROM "Organization" WHERE ico = '11111111' LIMIT 1`,
      )
    ).rows[0].id;

    const orgGreenId = (
      await client.query<{ id: string }>(
        `SELECT id FROM "Organization" WHERE ico = '22222222' LIMIT 1`,
      )
    ).rows[0].id;

    const orgDataId = (
      await client.query<{ id: string }>(
        `SELECT id FROM "Organization" WHERE ico = '33333333' LIMIT 1`,
      )
    ).rows[0].id;

    const orgStartupId = (
      await client.query<{ id: string }>(
        `SELECT id FROM "Organization" WHERE ico = '44444444' LIMIT 1`,
      )
    ).rows[0].id;

    // -----------------------------------------------------------------------
    // System users: admins, mentors, evaluators, editor
    // -----------------------------------------------------------------------
    const systemUsers = [
      {
        id: IDS.admin1,
        firstName: 'Anna',
        lastName: 'Kováčová',
        email: 'admin1@dev.local',
        role: 'ADMIN',
      },
      {
        id: IDS.admin2,
        firstName: 'Peter',
        lastName: 'Novák',
        email: 'admin2@dev.local',
        role: 'ADMIN',
      },
      {
        id: IDS.mentor1,
        firstName: 'Ján',
        lastName: 'Horváth',
        email: 'mentor1@dev.local',
        role: 'MENTOR',
      },
      {
        id: IDS.mentor2,
        firstName: 'Eva',
        lastName: 'Šimková',
        email: 'mentor2@dev.local',
        role: 'MENTOR',
      },
      {
        id: IDS.mentor3,
        firstName: 'Michal',
        lastName: 'Blaho',
        email: 'mentor3@dev.local',
        role: 'MENTOR',
      },
      {
        id: IDS.evaluator1,
        firstName: 'Lucia',
        lastName: 'Marková',
        email: 'evaluator1@dev.local',
        role: 'EVALUATOR',
      },
      {
        id: IDS.evaluator2,
        firstName: 'Tomáš',
        lastName: 'Rusnák',
        email: 'evaluator2@dev.local',
        role: 'EVALUATOR',
      },
      {
        id: IDS.editor1,
        firstName: 'Zuzana',
        lastName: 'Benčíková',
        email: 'editor1@dev.local',
        role: 'CONTENT_EDITOR',
      },
    ];

    for (const u of systemUsers) {
      await upsertUser(client, u.id, { ...u, passwordHash: pw, now });
    }

    // -----------------------------------------------------------------------
    // Company owners & employees
    // -----------------------------------------------------------------------
    await upsertUser(client, IDS.ownerTechNova, {
      firstName: 'Rastislav',
      lastName: 'Krajči',
      email: 'owner@technova.dev.local',
      passwordHash: pw,
      role: 'COMPANY_OWNER',
      organizationId: orgTechNovaId,
      now,
    });
    await upsertUser(client, IDS.empTechNova, {
      firstName: 'Monika',
      lastName: 'Vargová',
      email: 'employee@technova.dev.local',
      passwordHash: pw,
      role: 'COMPANY_EMPLOYEE',
      organizationId: orgTechNovaId,
      now,
    });
    await upsertUser(client, IDS.ownerGreen, {
      firstName: 'Branislav',
      lastName: 'Zelený',
      email: 'owner@green.dev.local',
      passwordHash: pw,
      role: 'COMPANY_OWNER',
      organizationId: orgGreenId,
      now,
    });
    await upsertUser(client, IDS.ownerData, {
      firstName: 'Katarína',
      lastName: 'Dávidová',
      email: 'owner@data.dev.local',
      passwordHash: pw,
      role: 'COMPANY_OWNER',
      organizationId: orgDataId,
      now,
    });
    await upsertUser(client, IDS.ownerStartup, {
      firstName: 'Filip',
      lastName: 'Starý',
      email: 'owner@startup.dev.local',
      passwordHash: pw,
      role: 'COMPANY_OWNER',
      organizationId: orgStartupId,
      now,
    });

    // -----------------------------------------------------------------------
    // Students (15)
    // -----------------------------------------------------------------------
    const students = [
      // id,   firstName,  lastName,   email,                  univId,    facId,     specId,        degree,     year
      [
        IDS.student01,
        'Adam',
        'Baláž',
        'student01@dev.local',
        univSTUId,
        facFEIId,
        specSoftEngId,
        'MASTER',
        2,
      ],
      [
        IDS.student02,
        'Barbora',
        'Čierná',
        'student02@dev.local',
        univSTUId,
        facFEIId,
        specSoftEngId,
        'BACHELOR',
        3,
      ],
      [
        IDS.student03,
        'Cyril',
        'Dobiáš',
        'student03@dev.local',
        univSTUId,
        facFIITId,
        specAIId,
        'MASTER',
        1,
      ],
      [
        IDS.student04,
        'Dana',
        'Ertlová',
        'student04@dev.local',
        univUKId,
        facMFFId,
        specCSId,
        'MASTER',
        2,
      ],
      [
        IDS.student05,
        'Eduard',
        'Farkaš',
        'student05@dev.local',
        univUKId,
        facMFFId,
        specCSId,
        'BACHELOR',
        3,
      ],
      [
        IDS.student06,
        'Fiona',
        'Gáborová',
        'student06@dev.local',
        univSTUId,
        facFIITId,
        specAIId,
        'MASTER',
        1,
      ],
      [
        IDS.student07,
        'Gregor',
        'Hlúpik',
        'student07@dev.local',
        univSTUId,
        facFIITId,
        specAIId,
        'BACHELOR',
        2,
      ],
      [
        IDS.student08,
        'Helena',
        'Ivánová',
        'student08@dev.local',
        univSTUId,
        facFEIId,
        specSoftEngId,
        'BACHELOR',
        3,
      ],
      [
        IDS.student09,
        'Ivan',
        'Jakubík',
        'student09@dev.local',
        univUKId,
        facMFFId,
        specCSId,
        'MASTER',
        2,
      ],
      [
        IDS.student10,
        'Jana',
        'Kováčová',
        'student10@dev.local',
        univEKONId,
        facNHFId,
        specFinanceId,
        'BACHELOR',
        2,
      ],
      [
        IDS.student11,
        'Karol',
        'Lukáč',
        'student11@dev.local',
        univSTUId,
        facFEIId,
        specSoftEngId,
        'MASTER',
        1,
      ],
      [
        IDS.student12,
        'Lenka',
        'Malíková',
        'student12@dev.local',
        univSTUId,
        facFIITId,
        specAIId,
        'BACHELOR',
        3,
      ],
      [
        IDS.student13,
        'Martin',
        'Nemec',
        'student13@dev.local',
        univUKId,
        facMFFId,
        specCSId,
        'BACHELOR',
        1,
      ],
      [
        IDS.student14,
        'Nina',
        'Oravec',
        'student14@dev.local',
        univEKONId,
        facNHFId,
        specFinanceId,
        'MASTER',
        2,
      ],
      [
        IDS.student15,
        'Ondrej',
        'Polák',
        'student15@dev.local',
        univSTUId,
        facFEIId,
        specSoftEngId,
        'BACHELOR',
        2,
      ],
    ] as const;

    for (const [id, firstName, lastName, email, , , , ,] of students) {
      await upsertUser(client, id, {
        firstName,
        lastName,
        email,
        passwordHash: pw,
        role: 'STUDENT',
        now,
      });
    }

    // Student profiles
    const spIds = [
      IDS.sp01,
      IDS.sp02,
      IDS.sp03,
      IDS.sp04,
      IDS.sp05,
      IDS.sp06,
      IDS.sp07,
      IDS.sp08,
      IDS.sp09,
      IDS.sp10,
      IDS.sp11,
      IDS.sp12,
      IDS.sp13,
      IDS.sp14,
      IDS.sp15,
    ];
    const studentFocusAreas: string[][] = [
      ['SOFTWARE_DEVELOPMENT', 'WEB_APPLICATIONS'],
      ['SOFTWARE_DEVELOPMENT'],
      ['AI_AND_DATA'],
      ['AI_AND_DATA', 'SOFTWARE_DEVELOPMENT'],
      ['WEB_APPLICATIONS', 'MOBILE_DEVELOPMENT'],
      ['AI_AND_DATA'],
      ['AI_AND_DATA', 'DEVOPS_AND_INFRASTRUCTURE'],
      ['WEB_APPLICATIONS'],
      ['SOFTWARE_DEVELOPMENT', 'DEVOPS_AND_INFRASTRUCTURE'],
      ['PRODUCT_PROJECT_MANAGEMENT'],
      ['SOFTWARE_DEVELOPMENT', 'WEB_APPLICATIONS'],
      ['AI_AND_DATA'],
      ['WEB_APPLICATIONS', 'MOBILE_DEVELOPMENT'],
      ['PRODUCT_PROJECT_MANAGEMENT', 'UI_UX_DESIGN'],
      ['SOFTWARE_DEVELOPMENT'],
    ];
    const studentRoles: string[][] = [
      ['FULLSTACK', 'BACKEND'],
      ['BACKEND'],
      ['AI_DATA'],
      ['AI_DATA', 'BACKEND'],
      ['FRONTEND', 'MOBILE'],
      ['AI_DATA'],
      ['AI_DATA', 'DEVOPS'],
      ['FRONTEND'],
      ['BACKEND', 'DEVOPS'],
      ['PRODUCT_MANAGER'],
      ['FULLSTACK'],
      ['AI_DATA'],
      ['FRONTEND', 'MOBILE'],
      ['PRODUCT_MANAGER', 'UI_UX'],
      ['BACKEND'],
    ];

    for (let i = 0; i < students.length; i++) {
      const [userId, , , , univId, facId, specId, degree, year] = students[i];
      const spId = spIds[i];
      await client.query(
        `INSERT INTO "StudentProfile" (
          id, "userId", "universityId", "facultyId", "specializationId",
          "degreeLevel", "studyMode", "studyYear", "expectedGraduationYear",
          "focusAreas", "preferredRoles", "softSkills",
          "createdAt", "updatedAt"
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13)
        ON CONFLICT ("userId") DO NOTHING`,
        [
          spId,
          userId,
          univId,
          facId,
          specId,
          degree,
          'FULL_TIME',
          year,
          2026 + (2 - (year as number)),
          studentFocusAreas[i],
          studentRoles[i],
          ['TEAMWORK', 'COMMUNICATION', 'PROBLEM_SOLVING'],
          now,
        ],
      );
    }

    // Student skills
    const skillSets: Array<Array<[string, string, number]>> = [
      [
        ['TypeScript', 'ADVANCED', 18],
        ['Node.js', 'ADVANCED', 12],
        ['React', 'INTERMEDIATE', 8],
      ],
      [
        ['Java', 'INTERMEDIATE', 12],
        ['Spring Boot', 'INTERMEDIATE', 6],
      ],
      [
        ['Python', 'ADVANCED', 24],
        ['TensorFlow', 'ADVANCED', 18],
        ['PyTorch', 'INTERMEDIATE', 12],
      ],
      [
        ['Python', 'ADVANCED', 20],
        ['scikit-learn', 'INTERMEDIATE', 10],
        ['TypeScript', 'BEGINNER', 3],
      ],
      [
        ['React', 'ADVANCED', 18],
        ['React Native', 'INTERMEDIATE', 8],
        ['CSS', 'ADVANCED', 24],
      ],
      [
        ['Python', 'ADVANCED', 20],
        ['Keras', 'INTERMEDIATE', 8],
      ],
      [
        ['Python', 'ADVANCED', 16],
        ['Docker', 'INTERMEDIATE', 10],
        ['Kubernetes', 'BEGINNER', 4],
      ],
      [
        ['Vue.js', 'INTERMEDIATE', 12],
        ['TypeScript', 'INTERMEDIATE', 8],
      ],
      [
        ['Go', 'ADVANCED', 24],
        ['Docker', 'ADVANCED', 18],
        ['PostgreSQL', 'ADVANCED', 20],
      ],
      [
        ['Figma', 'INTERMEDIATE', 12],
        ['Jira', 'INTERMEDIATE', 10],
      ],
      [
        ['TypeScript', 'ADVANCED', 20],
        ['NestJS', 'INTERMEDIATE', 10],
        ['React', 'INTERMEDIATE', 12],
      ],
      [
        ['Python', 'INTERMEDIATE', 14],
        ['TensorFlow', 'BEGINNER', 6],
      ],
      [
        ['React', 'INTERMEDIATE', 10],
        ['React Native', 'BEGINNER', 4],
      ],
      [
        ['Notion', 'ADVANCED', 20],
        ['Figma', 'ADVANCED', 14],
        ['Excel', 'ADVANCED', 36],
      ],
      [
        ['TypeScript', 'INTERMEDIATE', 10],
        ['Node.js', 'BEGINNER', 4],
      ],
    ];

    for (let i = 0; i < students.length; i++) {
      const spId = spIds[i];
      for (const [name, level, months] of skillSets[i]) {
        await client.query(
          `INSERT INTO "StudentSkill" (id, "studentProfileId", name, level, "experienceMonths", "isPrimary", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
           ON CONFLICT DO NOTHING`,
          [randomUUID(), spId, name, level, months, months >= 18, now],
        );
      }
    }

    // -----------------------------------------------------------------------
    // Teams
    // -----------------------------------------------------------------------
    const teams = [
      { id: IDS.teamAlpha, name: 'Team Alpha', leaderId: IDS.student01 },
      { id: IDS.teamBeta, name: 'Team Beta', leaderId: IDS.student04 },
      { id: IDS.teamGamma, name: 'Team Gamma', leaderId: IDS.student06 },
      { id: IDS.teamDelta, name: 'Team Delta', leaderId: IDS.student09 },
      { id: IDS.teamEpsilon, name: 'Team Epsilon', leaderId: IDS.student11 },
    ];

    for (const t of teams) {
      await client.query(
        `INSERT INTO "Team" (id, name, "leaderId", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $4)
         ON CONFLICT (id) DO NOTHING`,
        [t.id, t.name, t.leaderId, now],
      );
    }

    // Team memberships
    const memberships: Array<[string, string]> = [
      [IDS.student01, IDS.teamAlpha],
      [IDS.student02, IDS.teamAlpha],
      [IDS.student03, IDS.teamAlpha],
      [IDS.student04, IDS.teamBeta],
      [IDS.student05, IDS.teamBeta],
      [IDS.student06, IDS.teamGamma],
      [IDS.student07, IDS.teamGamma],
      [IDS.student08, IDS.teamGamma],
      [IDS.student09, IDS.teamDelta],
      [IDS.student10, IDS.teamDelta],
      [IDS.student11, IDS.teamEpsilon],
      [IDS.student12, IDS.teamEpsilon],
    ];

    for (const [userId, teamId] of memberships) {
      await client.query(
        `INSERT INTO "TeamMember" ("userId", "teamId") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [userId, teamId],
      );
    }

    // -----------------------------------------------------------------------
    // Backlog items (9 items across all statuses)
    // -----------------------------------------------------------------------
    const ownerTechNovaDbId = (
      await client.query<{ id: string }>(
        `SELECT id FROM "User" WHERE email = 'owner@technova.dev.local' LIMIT 1`,
      )
    ).rows[0].id;

    const ownerGreenDbId = (
      await client.query<{ id: string }>(
        `SELECT id FROM "User" WHERE email = 'owner@green.dev.local' LIMIT 1`,
      )
    ).rows[0].id;

    const ownerDataDbId = (
      await client.query<{ id: string }>(
        `SELECT id FROM "User" WHERE email = 'owner@data.dev.local' LIMIT 1`,
      )
    ).rows[0].id;

    const ownerStartupDbId = (
      await client.query<{ id: string }>(
        `SELECT id FROM "User" WHERE email = 'owner@startup.dev.local' LIMIT 1`,
      )
    ).rows[0].id;

    const backlogItems = [
      {
        id: IDS.backlog01,
        orgId: orgTechNovaId,
        poId: ownerTechNovaDbId,
        status: 'IN_REALIZATION',
        title: 'Automatizovaný onboarding systém pre zamestnancov',
        description:
          'Vybudovať komplexný self-service portál, ktorý prevedie nových zamestnancov celým procesom nástupu: od podpisu zmlúv cez školenia až po pridelenie prístupov. Integrácia s HR systémom a Active Directory.',
        budget: 9500,
        expectedOutcomes:
          'Funkčný portál, integrácia s AD, automatické posielanie dokumentov, admin dashboard pre HR, pokrytie testami ≥ 75 %.',
      },
      {
        id: IDS.backlog02,
        orgId: orgTechNovaId,
        poId: ownerTechNovaDbId,
        status: 'ASSIGNED',
        title: 'AI asistent pre zákaznícku podporu',
        description:
          'Integrovať LLM-based chatbota do existujúcej support platformy. Chatbot má zvládnuť tier-1 otázky, napojiť sa na CRM a automaticky eskalovať komplexné prípady ľudskému agentovi.',
        budget: 8000,
        expectedOutcomes:
          'Fungujúci chatbot prototyp, CRM integrácia, handoff workflow, testy ≥ 70 %.',
      },
      {
        id: IDS.backlog03,
        orgId: orgGreenId,
        poId: ownerGreenDbId,
        status: 'IN_PAIRING',
        title: 'Dashboard pre monitorovanie spotreby energie',
        description:
          'Vytvoriť real-time dashboard, ktorý agreguje dáta zo smart meračov a zobrazuje spotrebu energie na úrovni budovy, poschodia a miestnosti. Upozornenia pri anomáliách.',
        budget: 6000,
        expectedOutcomes:
          'Real-time dashboard, IoT integrácia, email/SMS alerting, mobilne responzívne UI.',
      },
      {
        id: IDS.backlog04,
        orgId: orgGreenId,
        poId: ownerGreenDbId,
        status: 'IN_PAIRING',
        title: 'Mobilná aplikácia pre komunitné záhrady',
        description:
          'Aplikácia pre správu komunitných záhrad: rezervácia záhonov, plán zavlažovania, zdieľanie sklizne a diskusné fórum pre pestovateľov.',
        budget: 5500,
        expectedOutcomes:
          'iOS + Android app (React Native), backend API, push notifikácie, offline podpora.',
      },
      {
        id: IDS.backlog05,
        orgId: orgDataId,
        poId: ownerDataDbId,
        status: 'PUBLISHED',
        title: 'Automatická generácia reportov z ERP dát',
        description:
          'Napojiť sa na SAP ERP API, transformovať dáta a generovať PDF/Excel reporty podľa šablón. Reporty sa posielajú emailom podľa nastaveného rozvrhu.',
        budget: 7000,
        expectedOutcomes:
          'Konektory pre SAP, engine na šablóny, PDF/Excel export, scheduler, audit log.',
      },
      {
        id: IDS.backlog06,
        orgId: orgDataId,
        poId: ownerDataDbId,
        status: 'PUBLISHED',
        title: 'Prediktívna analytika pre inventory management',
        description:
          'Vyvinúť ML model na predikciu dopytu a optimalizáciu zásob. Model sa napojí na existujúci skladový systém a bude generovať odporúčania na objednávanie.',
        budget: 11000,
        expectedOutcomes:
          'Trénovaný model (MAPE < 15 %), REST API, integrácia so skladovým systémom, monitoring dashboard.',
      },
      {
        id: IDS.backlog07,
        orgId: orgStartupId,
        poId: ownerStartupDbId,
        status: 'PUBLISHED',
        title: 'P2P platforma pre mikropôžičky',
        description:
          'Fintech platforma spájajúca veriteľov a dlžníkov pre krátkodobé mikropôžičky. Zahŕňa KYC verifikáciu, scoring model a escrow platobný systém.',
        budget: 15000,
        expectedOutcomes:
          'KYC flow, credit scoring modul, escrow integrácia, admin panel pre compliance, GDPR compliance.',
      },
      {
        id: IDS.backlog08,
        orgId: orgTechNovaId,
        poId: ownerTechNovaDbId,
        status: 'DRAFT',
        title: 'Interný knowledge base s AI vyhľadávaním',
        description:
          'Vybudovať internú wiki s AI-powered vyhľadávaním (RAG), kde zamestnanci môžu zdieľať znalosti, postupy a dokumentáciu. Integrácia so Slack-om.',
        budget: 8500,
        expectedOutcomes:
          'Wiki s verzionovaním, RAG vyhľadávanie, Slack bot, roly a oprávnenia, analytics.',
      },
      {
        id: IDS.backlog09,
        orgId: orgGreenId,
        poId: ownerGreenDbId,
        status: 'CLOSED',
        title: 'Web scraper pre monitoring cien energií',
        description:
          'Automatizovaný scraper, ktorý zbiera ceny elektriny a plynu z verejných zdrojov a ukladá ich do databázy pre ďalšiu analýzu.',
        budget: 3000,
        expectedOutcomes:
          'Funkčný scraper, databáza s históriou cien, REST API, denné automatické spustenie.',
      },
    ];

    for (const item of backlogItems) {
      await client.query(
        `INSERT INTO "BacklogItem" (id, "organizationId", "productOwnerUserId", title, description, budget, "expectedOutcomes", status, "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)
         ON CONFLICT (id) DO NOTHING`,
        [
          item.id,
          item.orgId,
          item.poId,
          item.title,
          item.description,
          item.budget,
          item.expectedOutcomes,
          item.status,
          now,
        ],
      );
    }

    // -----------------------------------------------------------------------
    // Program B — Team Applications
    // -----------------------------------------------------------------------
    const pbApps = [
      // Team Alpha → Backlog01 (IN_REALIZATION) — PROJECT_CREATED
      {
        id: IDS.pbApp01,
        backlogItemId: IDS.backlog01,
        teamId: IDS.teamAlpha,
        createdById: IDS.student01,
        status: 'PROJECT_CREATED',
        motivation:
          'Náš tím má silné skúsenosti s NestJS a PostgreSQL. Tento projekt nám dá príležitosť aplikovať poznatky z praxe na reálny HR problém.',
        acceptedAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      },
      // Team Beta → Backlog02 (ASSIGNED) — ACCEPTED
      {
        id: IDS.pbApp02,
        backlogItemId: IDS.backlog02,
        teamId: IDS.teamBeta,
        createdById: IDS.student04,
        status: 'ACCEPTED',
        motivation:
          'Zaujíma nás práca s LLM a integrácia AI do produktov. Máme skúsenosti s Pythonom a MLOps.',
        acceptedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      },
      // Team Gamma → Backlog03 (IN_PAIRING) — SHORTLISTED
      {
        id: IDS.pbApp03,
        backlogItemId: IDS.backlog03,
        teamId: IDS.teamGamma,
        createdById: IDS.student06,
        status: 'SHORTLISTED',
        motivation:
          'Tím sa zaujíma o IoT a vizualizáciu dát v reálnom čase. Máme skúsenosti s React a WebSocket.',
        shortlistedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      },
      // Team Delta → Backlog04 (IN_PAIRING) — SUBMITTED
      {
        id: IDS.pbApp04,
        backlogItemId: IDS.backlog04,
        teamId: IDS.teamDelta,
        createdById: IDS.student09,
        status: 'SUBMITTED',
        motivation:
          'Mobilný development je naša silná stránka. Navrhneme offline-first architektúru s React Native.',
        shortlistedAt: null,
      },
      // Another team applies to Backlog03 — SUBMITTED (competing application)
      {
        id: IDS.pbApp05,
        backlogItemId: IDS.backlog03,
        teamId: IDS.teamEpsilon,
        createdById: IDS.student11,
        status: 'SUBMITTED',
        motivation:
          'Sme tím backendových a DevOps vývojárov. IoT integráciu zvládneme cez MQTT broker a Kubernetes.',
        shortlistedAt: null,
      },
    ];

    for (const app of pbApps) {
      await client.query(
        `INSERT INTO "ProgramBTeamApplication" (
          id, "backlogItemId", "teamId", "createdById", motivation, status,
          "submittedAt", "shortlistedAt", "acceptedAt", "createdAt", "updatedAt"
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)
        ON CONFLICT (id) DO NOTHING`,
        [
          app.id,
          app.backlogItemId,
          app.teamId,
          app.createdById,
          app.motivation,
          app.status,
          now,
          app.shortlistedAt ?? null,
          (app as { acceptedAt?: Date }).acceptedAt ?? null,
          now,
        ],
      );
    }

    // -----------------------------------------------------------------------
    // Program B — Projects
    // -----------------------------------------------------------------------

    // Project 1: Team Alpha on Backlog01 — ACTIVE (IN_REALIZATION, has mentor)
    await client.query(
      `INSERT INTO "ProgramBProject" (
        id, "backlogItemId", "teamApplicationId", "teamId",
        "productOwnerUserId", "mentorUserId", "mentorAssignedAt", "mentorAssignedById",
        status, "acceptedByCompanyAt", "acceptedByNtiAt", "createdAt", "updatedAt"
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12)
      ON CONFLICT (id) DO NOTHING`,
      [
        IDS.pbProject01,
        IDS.backlog01,
        IDS.pbApp01,
        IDS.teamAlpha,
        ownerTechNovaDbId,
        IDS.mentor1,
        new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
        IDS.admin1,
        'ACTIVE',
        new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000),
        new Date(now.getTime() - 17 * 24 * 60 * 60 * 1000),
        now,
      ],
    );

    // Milestones for Project 1
    const pbMilestones = [
      {
        title: 'Analýza požiadaviek a ER diagram',
        status: 'DONE',
        dueAt: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Backend API (NestJS + Prisma)',
        status: 'IN_PROGRESS',
        dueAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Frontend integrácia',
        status: 'PLANNED',
        dueAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'AD integrácia',
        status: 'PLANNED',
        dueAt: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Testovanie a odovzdanie',
        status: 'PLANNED',
        dueAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      },
    ];

    for (const m of pbMilestones) {
      await client.query(
        `INSERT INTO "ProgramBMilestone" (id, "projectId", title, status, "dueAt", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$6)
         ON CONFLICT (id) DO NOTHING`,
        [randomUUID(), IDS.pbProject01, m.title, m.status, m.dueAt, now],
      );
    }

    // Mentoring notes for Project 1
    const mentoringNotes = [
      'Tím má dobrý základ, ale treba spresniť API kontrakt pred implementáciou frontendu.',
      'Databázová schéma je dobre navrhnutá. Odporúčam pridať indexy na FK stĺpce.',
      'Pokrok je solídny. Na budúcom stretnutí sa pozrieme na integračné testy.',
    ];

    for (const note of mentoringNotes) {
      await client.query(
        `INSERT INTO "ProgramBMentoringNote" (id, "projectId", "authorUserId", note, "createdAt")
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (id) DO NOTHING`,
        [randomUUID(), IDS.pbProject01, IDS.mentor1, note, now],
      );
    }

    // PO reviews for Project 1
    await client.query(
      `INSERT INTO "ProgramBPoReview" (id, "projectId", "authorUserId", decision, comment, "createdAt")
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO NOTHING`,
      [
        randomUUID(),
        IDS.pbProject01,
        ownerTechNovaDbId,
        'APPROVED',
        'Prvý míľnik splnený. Analýza požiadaviek je kompletná a ER diagram zodpovedá špecifikácii.',
        now,
      ],
    );

    // Project 2: Team Beta on Backlog02 — ACTIVE (newly accepted, no mentor yet)
    await client.query(
      `INSERT INTO "ProgramBProject" (
        id, "backlogItemId", "teamApplicationId", "teamId",
        "productOwnerUserId", status, "acceptedByCompanyAt", "createdAt", "updatedAt"
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)
      ON CONFLICT (id) DO NOTHING`,
      [
        IDS.pbProject02,
        IDS.backlog02,
        IDS.pbApp02,
        IDS.teamBeta,
        ownerTechNovaDbId,
        'ACTIVE',
        new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
        now,
      ],
    );

    // -----------------------------------------------------------------------
    // Program A — Applications (5 teams, various statuses)
    // -----------------------------------------------------------------------
    const programACallRow = await client.query<{ id: string }>(
      `SELECT id FROM "Call" WHERE type = 'PROGRAM_A' LIMIT 1`,
    );
    const programACallId = programACallRow.rows[0]?.id;

    if (programACallId) {
      const paApps = [
        // Team Alpha — ACTIVE_PROJECT (approved, mentor assigned, has milestones)
        {
          id: IDS.paApp01,
          teamId: IDS.teamAlpha,
          createdById: IDS.student01,
          status: 'ACTIVE_PROJECT',
          mentorUserId: IDS.mentor2,
          submittedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          decidedAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
          decisionById: IDS.admin1,
          decisionRationale:
            'Silný tím s jasnou víziou produktu a technickým zázemím.',
        },
        // Team Beta — EVALUATING (has evaluations)
        {
          id: IDS.paApp02,
          teamId: IDS.teamBeta,
          createdById: IDS.student04,
          status: 'EVALUATING',
          submittedAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
          decidedAt: null,
          decisionById: null,
          decisionRationale: null,
          mentorUserId: null,
        },
        // Team Gamma — NEEDS_INFO (has open needs-info item)
        {
          id: IDS.paApp03,
          teamId: IDS.teamGamma,
          createdById: IDS.student06,
          status: 'NEEDS_INFO',
          submittedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
          decidedAt: null,
          decisionById: null,
          decisionRationale: null,
          mentorUserId: null,
        },
        // Team Delta — SUBMITTED
        {
          id: IDS.paApp04,
          teamId: IDS.teamDelta,
          createdById: IDS.student09,
          status: 'SUBMITTED',
          submittedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
          decidedAt: null,
          decisionById: null,
          decisionRationale: null,
          mentorUserId: null,
        },
        // Team Epsilon — DRAFT
        {
          id: IDS.paApp05,
          teamId: IDS.teamEpsilon,
          createdById: IDS.student11,
          status: 'DRAFT',
          submittedAt: null,
          decidedAt: null,
          decisionById: null,
          decisionRationale: null,
          mentorUserId: null,
        },
      ];

      for (const app of paApps) {
        await client.query(
          `INSERT INTO "Application" (
            id, "callId", "teamId", "createdById", status,
            "submittedAt", "decidedAt", "decisionById", "decisionRationale",
            "mentorUserId", "mentorAssignedAt", "mentorAssignedById",
            "createdAt", "updatedAt"
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13)
          ON CONFLICT (id) DO NOTHING`,
          [
            app.id,
            programACallId,
            app.teamId,
            app.createdById,
            app.status,
            app.submittedAt,
            app.decidedAt,
            app.decisionById,
            app.decisionRationale,
            app.mentorUserId ?? null,
            app.mentorUserId
              ? new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000)
              : null,
            app.mentorUserId ? IDS.admin1 : null,
            now,
          ],
        );
      }

      // Evaluations for Team Beta application
      const evaluationCriteria = [
        'innovation',
        'technical_feasibility',
        'team_quality',
        'market_potential',
      ];

      for (const [evalId, evaluatorId, recommendation, comment, scores] of [
        [
          randomUUID(),
          IDS.evaluator1,
          'APPROVE',
          'Silný návrh s jasnou hodnotovou ponukou. Tím má relevantné skúsenosti.',
          [4, 4, 5, 4],
        ],
        [
          randomUUID(),
          IDS.evaluator2,
          'NEEDS_INFO',
          'Inovatívny prístup, ale finančný plán je nejasný. Potrebujeme viac detailov.',
          [5, 3, 4, 3],
        ],
      ] as const) {
        await client.query(
          `INSERT INTO "ApplicationEvaluation" (id, "applicationId", "evaluatorId", recommendation, comment, "createdAt", "updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$6)
           ON CONFLICT ("applicationId", "evaluatorId") DO NOTHING`,
          [evalId, IDS.paApp02, evaluatorId, recommendation, comment, now],
        );

        const evalDbRow = await client.query<{ id: string }>(
          `SELECT id FROM "ApplicationEvaluation" WHERE "applicationId" = $1 AND "evaluatorId" = $2 LIMIT 1`,
          [IDS.paApp02, evaluatorId],
        );
        const evalDbId = evalDbRow.rows[0]?.id;
        if (evalDbId) {
          for (let i = 0; i < evaluationCriteria.length; i++) {
            await client.query(
              `INSERT INTO "ApplicationEvaluationScore" (id, "evaluationId", "criterionCode", score)
               VALUES ($1,$2,$3,$4)
               ON CONFLICT ("evaluationId", "criterionCode") DO NOTHING`,
              [randomUUID(), evalDbId, evaluationCriteria[i], scores[i]],
            );
          }
        }
      }

      // NeedsInfo item for Team Gamma application
      await client.query(
        `INSERT INTO "NeedsInfoItem" (id, "applicationId", message, "dueAt", status, "createdById", "createdAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (id) DO NOTHING`,
        [
          randomUUID(),
          IDS.paApp03,
          'Prosíme o doplnenie podrobného finančného plánu na celú dobu realizácie projektu vrátane rozdelenia nákladov na jednotlivé míľniky.',
          new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          'OPEN',
          IDS.admin1,
          now,
        ],
      );

      // Status events for Team Alpha application (transition history)
      const alphaStatusHistory = [
        {
          from: 'DRAFT',
          to: 'SUBMITTED',
          by: IDS.student01,
          at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        },
        {
          from: 'SUBMITTED',
          to: 'FORMALLY_VERIFIED',
          by: IDS.admin1,
          at: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000),
        },
        {
          from: 'FORMALLY_VERIFIED',
          to: 'EVALUATING',
          by: IDS.admin1,
          at: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
        },
        {
          from: 'EVALUATING',
          to: 'APPROVED',
          by: IDS.admin1,
          at: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
        },
        {
          from: 'APPROVED',
          to: 'ONBOARDING',
          by: IDS.admin1,
          at: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000),
        },
        {
          from: 'ONBOARDING',
          to: 'ACTIVE_PROJECT',
          by: IDS.admin1,
          at: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
        },
      ];

      for (const ev of alphaStatusHistory) {
        await client.query(
          `INSERT INTO "ApplicationStatusEvent" (id, "applicationId", "fromStatus", "toStatus", "changedById", "createdAt")
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (id) DO NOTHING`,
          [randomUUID(), IDS.paApp01, ev.from, ev.to, ev.by, ev.at],
        );
      }

      // Program A milestones for Team Alpha
      const paMilestones = [
        {
          title: 'Kick-off a definícia MVP',
          status: 'DONE',
          dueAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        },
        {
          title: 'Prototyp a používateľské testovanie',
          status: 'IN_PROGRESS',
          dueAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
        {
          title: 'Beta verzia',
          status: 'PLANNED',
          dueAt: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000),
        },
        {
          title: 'Finálne odovzdanie',
          status: 'PLANNED',
          dueAt: new Date(now.getTime() + 42 * 24 * 60 * 60 * 1000),
        },
      ];

      for (const m of paMilestones) {
        await client.query(
          `INSERT INTO "ProgramAMilestone" (id, "applicationId", title, status, "dueAt", "createdAt", "updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$6)
           ON CONFLICT (id) DO NOTHING`,
          [randomUUID(), IDS.paApp01, m.title, m.status, m.dueAt, now],
        );
      }

      // Mentorship notes for Team Alpha
      for (const note of [
        'Tím je motivovaný a má jasnú predstavu o produkte. Odporúčam zamerať sa na validáciu s potenciálnymi používateľmi čo najskôr.',
        'Pokrok na prototypu je solídny. Treba dokončiť user testing pred prechodom na beta fázu.',
      ]) {
        await client.query(
          `INSERT INTO "ProgramAMentorshipNote" (id, "applicationId", "authorId", content, "createdAt")
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (id) DO NOTHING`,
          [randomUUID(), IDS.paApp01, IDS.mentor2, note, now],
        );
      }
    }

    // -----------------------------------------------------------------------
    // Summary
    // -----------------------------------------------------------------------
    console.info('[seed] dev fixtures created successfully');
    console.info('[seed] --- DEV ACCOUNTS (password: Dev1234!) ---');
    console.info('[seed] admin1@dev.local / admin2@dev.local  — ADMIN');
    console.info(
      '[seed] mentor1@dev.local / mentor2@dev.local / mentor3@dev.local  — MENTOR',
    );
    console.info(
      '[seed] evaluator1@dev.local / evaluator2@dev.local  — EVALUATOR',
    );
    console.info('[seed] editor1@dev.local  — CONTENT_EDITOR');
    console.info(
      '[seed] owner@technova.dev.local / employee@technova.dev.local  — TechNova s.r.o.',
    );
    console.info('[seed] owner@green.dev.local  — GreenSolutions a.s.');
    console.info('[seed] owner@data.dev.local  — DataDriven s.r.o.');
    console.info('[seed] owner@startup.dev.local  — StartupXYZ s.r.o.');
    console.info(
      '[seed] student01@dev.local ... student15@dev.local  — STUDENT',
    );
  },
};
