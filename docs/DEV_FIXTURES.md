# Dev Fixtures Reference

Run with: `npm run seed:dev`  
All accounts use password: **`Dev1234!`**

---

## System Users

| Email | Role | Name |
|---|---|---|
| `admin@nti.sk` | SUPER_ADMIN | NTI Superadmin *(from seed 001)* |
| `admin1@dev.local` | ADMIN | Anna Kováčová |
| `admin2@dev.local` | ADMIN | Peter Novák |
| `mentor1@dev.local` | MENTOR | Ján Horváth |
| `mentor2@dev.local` | MENTOR | Eva Šimková |
| `mentor3@dev.local` | MENTOR | Michal Blaho |
| `evaluator1@dev.local` | EVALUATOR | Lucia Marková |
| `evaluator2@dev.local` | EVALUATOR | Tomáš Rusnák |
| `editor1@dev.local` | CONTENT_EDITOR | Zuzana Benčíková |

---

## Organizations & Company Users

| Organization | IČO | Sector | Status |
|---|---|---|---|
| TechNova s.r.o. | 11111111 | Technology | ACTIVE |
| GreenSolutions a.s. | 22222222 | Environment | ACTIVE |
| DataDriven s.r.o. | 33333333 | Analytics | ACTIVE |
| StartupXYZ s.r.o. | 44444444 | Fintech | ACTIVE |

| Email | Role | Organization |
|---|---|---|
| `owner@technova.dev.local` | COMPANY_OWNER | TechNova s.r.o. |
| `employee@technova.dev.local` | COMPANY_EMPLOYEE | TechNova s.r.o. |
| `owner@green.dev.local` | COMPANY_OWNER | GreenSolutions a.s. |
| `owner@data.dev.local` | COMPANY_OWNER | DataDriven s.r.o. |
| `owner@startup.dev.local` | COMPANY_OWNER | StartupXYZ s.r.o. |

---

## Students

| Email | Name | University | Faculty | Specialization | Degree | Year | Primary Skills |
|---|---|---|---|---|---|---|---|
| `student01@dev.local` | Adam Baláž | STU | FEI | Softvérové inžinierstvo | MASTER | 2 | TypeScript (ADV), Node.js (ADV), React (INT) |
| `student02@dev.local` | Barbora Čierná | STU | FEI | Softvérové inžinierstvo | BACHELOR | 3 | Java (INT), Spring Boot (INT) |
| `student03@dev.local` | Cyril Dobiáš | STU | FIIT | Umelá inteligencia | MASTER | 1 | Python (ADV), TensorFlow (ADV), PyTorch (INT) |
| `student04@dev.local` | Dana Ertlová | UK | FMFI | Informatika | MASTER | 2 | Python (ADV), scikit-learn (INT), TypeScript (BEG) |
| `student05@dev.local` | Eduard Farkaš | UK | FMFI | Informatika | BACHELOR | 3 | React (ADV), React Native (INT), CSS (ADV) |
| `student06@dev.local` | Fiona Gáborová | STU | FIIT | Umelá inteligencia | MASTER | 1 | Python (ADV), Keras (INT) |
| `student07@dev.local` | Gregor Hlúpik | STU | FIIT | Umelá inteligencia | BACHELOR | 2 | Python (ADV), Docker (INT), Kubernetes (BEG) |
| `student08@dev.local` | Helena Ivánová | STU | FEI | Softvérové inžinierstvo | BACHELOR | 3 | Vue.js (INT), TypeScript (INT) |
| `student09@dev.local` | Ivan Jakubík | UK | FMFI | Informatika | MASTER | 2 | Go (ADV), Docker (ADV), PostgreSQL (ADV) |
| `student10@dev.local` | Jana Kováčová | EKON | NHF | Financie | BACHELOR | 2 | Figma (INT), Jira (INT) |
| `student11@dev.local` | Karol Lukáč | STU | FEI | Softvérové inžinierstvo | MASTER | 1 | TypeScript (ADV), NestJS (INT), React (INT) |
| `student12@dev.local` | Lenka Malíková | STU | FIIT | Umelá inteligencia | BACHELOR | 3 | Python (INT), TensorFlow (BEG) |
| `student13@dev.local` | Martin Nemec | UK | FMFI | Informatika | BACHELOR | 1 | React (INT), React Native (BEG) |
| `student14@dev.local` | Nina Oravec | EKON | NHF | Financie | MASTER | 2 | Notion (ADV), Figma (ADV), Excel (ADV) |
| `student15@dev.local` | Ondrej Polák | STU | FEI | Softvérové inžinierstvo | BACHELOR | 2 | TypeScript (INT), Node.js (BEG) |

---

## Teams

| Team | Leader | Members | Locked |
|---|---|---|---|
| Team Alpha | student01 | student01, student02, student03 | No |
| Team Beta | student04 | student04, student05 | No |
| Team Gamma | student06 | student06, student07, student08 | No |
| Team Delta | student09 | student09, student10 | No |
| Team Epsilon | student11 | student11, student12 | No |

---

## Backlog Items (Program B)

| # | Title | Organization | Status | Budget |
|---|---|---|---|---|
| 1 | Automatizovaný onboarding systém pre zamestnancov | TechNova | **IN_REALIZATION** | €9 500 |
| 2 | AI asistent pre zákaznícku podporu | TechNova | **ASSIGNED** | €8 000 |
| 3 | Dashboard pre monitorovanie spotreby energie | GreenSolutions | **IN_PAIRING** | €6 000 |
| 4 | Mobilná aplikácia pre komunitné záhrady | GreenSolutions | **IN_PAIRING** | €5 500 |
| 5 | Automatická generácia reportov z ERP dát | DataDriven | **PUBLISHED** | €7 000 |
| 6 | Prediktívna analytika pre inventory management | DataDriven | **PUBLISHED** | €11 000 |
| 7 | P2P platforma pre mikropôžičky | StartupXYZ | **PUBLISHED** | €15 000 |
| 8 | Interný knowledge base s AI vyhľadávaním | TechNova | **DRAFT** | €8 500 |
| 9 | Web scraper pre monitoring cien energií | GreenSolutions | **CLOSED** | €3 000 |

---

## Program B — Team Applications

| Team | Backlog Item | Status | Notes |
|---|---|---|---|
| Team Alpha | #1 Onboarding systém | **PROJECT_CREATED** | Project was created, now IN_REALIZATION |
| Team Beta | #2 AI asistent | **ACCEPTED** | Project created, awaiting mentor assignment |
| Team Gamma | #3 Energy dashboard | **SHORTLISTED** | Competing with Team Epsilon |
| Team Epsilon | #3 Energy dashboard | **SUBMITTED** | Competing with Team Gamma |
| Team Delta | #4 Komunitné záhrady | **SUBMITTED** | Under review |

---

## Program B — Active Projects

### Project 1 — Team Alpha × TechNova (Onboarding systém)
- **Status:** ACTIVE
- **Mentor:** mentor1@dev.local
- **Product Owner:** owner@technova.dev.local
- **Accepted by company:** 18 days ago · **Accepted by NTI:** 17 days ago

| Milestone | Status |
|---|---|
| Analýza požiadaviek a ER diagram | DONE |
| Backend API (NestJS + Prisma) | IN_PROGRESS |
| Frontend integrácia | PLANNED |
| AD integrácia | PLANNED |
| Testovanie a odovzdanie | PLANNED |

- 3 mentoring notes from mentor1
- 1 PO review: APPROVED

### Project 2 — Team Beta × TechNova (AI asistent)
- **Status:** ACTIVE
- **Mentor:** *(not yet assigned)*
- **Product Owner:** owner@technova.dev.local
- **Accepted by company:** 8 days ago

---

## Program A — Applications

| Team | Status | Mentor | Notes |
|---|---|---|---|
| Team Alpha | **ACTIVE_PROJECT** | mentor2@dev.local | Full history: DRAFT → SUBMITTED → FORMALLY_VERIFIED → EVALUATING → APPROVED → ONBOARDING → ACTIVE_PROJECT |
| Team Beta | **EVALUATING** | — | 2 evaluations: evaluator1 (APPROVE), evaluator2 (NEEDS_INFO) |
| Team Gamma | **NEEDS_INFO** | — | 1 open NeedsInfo item (due in 7 days): financial plan details requested |
| Team Delta | **SUBMITTED** | — | Submitted 3 days ago |
| Team Epsilon | **DRAFT** | — | Not yet submitted |

### Team Alpha — Program A Detail
- **Milestones:**

| Milestone | Status |
|---|---|
| Kick-off a definícia MVP | DONE |
| Prototyp a používateľské testovanie | IN_PROGRESS |
| Beta verzia | PLANNED |
| Finálne odovzdanie | PLANNED |

- 2 mentorship notes from mentor2

### Team Beta — Evaluation Scores

| Criterion | evaluator1 | evaluator2 |
|---|---|---|
| innovation | 4 | 5 |
| technical_feasibility | 4 | 3 |
| team_quality | 5 | 4 |
| market_potential | 4 | 3 |
| **Recommendation** | APPROVE | NEEDS_INFO |

---

## University Structure

| University | Short | Faculty | Short | Specialization | Code |
|---|---|---|---|---|---|
| Slovenská technická univerzita | STU | Fakulta elektrotechniky a informatiky | FEI | Softvérové inžinierstvo | SI |
| Slovenská technická univerzita | STU | Fakulta informatiky a inf. technológií | FIIT | Umelá inteligencia | AI |
| Univerzita Komenského | UK | Fakulta matematiky, fyziky a informatiky | FMFI | Informatika | INF |
| Ekonomická univerzita | EKON | Národohospodárska fakulta | NHF | Financie | FIN |
