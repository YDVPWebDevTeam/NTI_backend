# NTI Backend

NTI Backend is a NestJS API for the NTI platform. The service uses PostgreSQL for persistence, Redis and BullMQ for background jobs, Prisma for data access, Fastify for HTTP, and Swagger for API documentation.

## Overview

The application is split into a few major areas:

- `auth`: registration, login, refresh/logout, email confirmation, password reset, and forced password changes
- `admin`: admin-only user status management and system invitation creation
- `organization`: organization records, status, and organization invitations
- `team`: team lifecycle, membership, and team invitations
- `invites`: invite validation and acceptance flows
- `files`: presigned uploads/downloads and upload tracking
- `infrastructure`: database, config, logging, mail, queueing, hashing, storage, and PDF support
- `worker`: background processing for queue jobs

If you are new to the codebase, start with:

1. `src/main.ts` for bootstrap, global validation, CORS, and Swagger
2. `src/app.module.ts` for the full module graph
3. `prisma/schema.prisma` for the domain model
4. `src/auth`, `src/files`, and `src/admin` for the highest-value business flows

## Prerequisites

- Node.js 22+
- npm
- Docker and Docker Compose

## Environment Setup

Create a local environment file from the example:

```bash
cp .env.example .env
```

Important variables:

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port for the API |
| `NODE_ENV` | Runtime mode |
| `DATABASE_URL` | PostgreSQL connection string used by Prisma |
| `CORS_ORIGINS` | Comma-separated list of allowed frontend origins |
| `REDIS_HOST` / `REDIS_PORT` | Redis connection used by BullMQ |
| `SMTP_*` | Email delivery configuration for confirmation/reset/invite flows |
| `FRONTEND_URL` | Frontend base URL used in generated links |
| `R2_*` | Cloudflare R2 object storage configuration |
| `FILE_UPLOAD_*` | Upload policy, presign expiry, size limit, and verification settings |
| `FILE_DOWNLOAD_PRESIGN_EXPIRES_SECONDS` | Presigned download link lifetime for private files |
| `JWT_*` | Access, refresh, and forced password change secrets and expirations |
| `ARGON2_TIME_COST` | Password hashing cost used by the seed and auth flows |
| `TOKEN_BYTE_LENGTH` | Token entropy used for generated auth/invite tokens |
| `EMAIL_VERIFICATION_EXPIRATION_HOURS` | Confirmation link lifetime |
| `PASSWORD_RESET_EXPIRATION_MINUTES` | Password reset token lifetime |
| `SYSTEM_INVITATION_EXPIRATION_HOURS` | System invitation lifetime |
| `SUPERADMIN_TEMP_PASSWORD` | Temporary password used by the seed task |

The full set of supported variables is defined in `src/infrastructure/config/env.schema.ts` and documented in `.env.example`.

## Running Locally

### Docker Compose

This boots the API, worker, PostgreSQL, and Redis together:

```bash
docker compose up
```

The API is available at `http://localhost:3001`.

### Manual Setup

If you want to run the app without Compose, start PostgreSQL and Redis first, then:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run start:dev
```

Run the worker in a second terminal when you need background jobs processed locally:

```bash
npm run start:worker:dev
```

## Common Workflows

### Authentication

The auth module supports:

- standard registration and login
- company-owner registration
- invite-based registration
- email confirmation
- access token refresh through HttpOnly cookies
- logout and refresh-token revocation
- forgotten password and password reset
- forced password change for privileged accounts

Behavior that is worth knowing:

- access tokens are returned in the JSON response
- refresh tokens are stored in an HttpOnly `refreshToken` cookie
- forced password changes use a short-lived `requiresPasswordChangeToken` cookie
- admin login can require an immediate password change before the session is usable

### Files

File uploads are designed around presigned URLs instead of streaming file bodies through the API.

- `POST /api/v1/files/upload-url` creates an upload record and returns a presigned upload URL
- `POST /api/v1/files/complete` marks the upload as finished after the object exists in storage
- `GET /api/v1/files/:id/download-url` returns a public URL or a presigned private download URL

Important file behaviors:

- uploads are validated against configured file size and MIME type limits
- private files use presigned download URLs
- public files resolve to a direct public URL
- completed uploads can optionally verify the uploaded object in storage

### Background Jobs

BullMQ and Redis handle asynchronous work such as email delivery and PDF generation.

- queue registration lives in `src/infrastructure/queue`
- processors live in `src/infrastructure/queue/processors`
- the worker entrypoint is `src/worker.ts`

### PDF Generation

The PDF module provides template-driven PDF creation and queue-backed processing.

- `src/infrastructure/pdf` contains the PDF services, template registry, and worker flow
- Puppeteer settings are controlled through `PUPPETEER_*`
- the worker can use a separate Chromium installation in containerized environments

## Database

Prisma is used for schema management and database access.

- Generate the client: `npm run prisma:generate`
- Create/apply local migrations: `npm run prisma:migrate`
- Apply migrations in deployment: `npm run prisma:migrate:deploy`
- Open Prisma Studio: `npm run prisma:studio`
- Reset the local database: `npm run prisma:reset`
- Seed the database: `npm run prisma:seed`

The Prisma schema and migration history live in `prisma/`.

### Domain Model Highlights

The schema centers on:

- `User` records with roles, account status, email confirmation, admin confirmation, and password-change flags
- `Organization` records with status and invitations
- `Team` records with leaders, members, locking, and archiving
- `Invitation`, `OrgInvitation`, and `SystemInvitation` flows for controlled onboarding
- `UploadedFile` records that track upload status, visibility, and storage keys
- `RefreshToken`, `EmailVerificationToken`, and `PasswordResetToken` records for auth lifecycle management

## Seeding

The seed pipeline currently creates a default superadmin account if none exists.

Notes:

- the seed requires `DATABASE_URL`
- `SUPERADMIN_TEMP_PASSWORD` must be set and at least 8 characters long
- the seeded account is created with `SUPER_ADMIN` role and `mustChangePassword=true`

## API Documentation

Swagger UI is available at:

```text
http://localhost:3001/api/docs
```

The REST API is prefixed with:

```text
/api/v1
```

Swagger includes bearer auth for access tokens and cookie auth for refresh and forced password change flows.

## Available Scripts

```bash
npm run build
npm run start
npm run start:dev
npm run start:worker
npm run start:worker:dev
npm run lint
npm run format
npm run typescript
npm run test
npm run test:watch
npm run test:cov
npm run test:e2e
npm run prisma:generate
npm run prisma:migrate
npm run prisma:migrate:deploy
npm run prisma:studio
npm run prisma:reset
npm run prisma:seed
```

## Code Quality

- ESLint handles linting
- Prettier handles formatting
- TypeScript checks are available through `npm run typescript`
- Husky, lint-staged, and Commitizen are configured for contributor workflow support

## Repository Structure

```text
src/
  auth/              authentication, tokens, email confirmation, password reset
  admin/             admin user status management and system invitations
  organization/      organization entities and invitations
  team/              team membership and invites
  invites/           invite validation and acceptance logic
  files/             upload/download record management
  infrastructure/    shared technical modules
  common/            shared types, validation, and filters
prisma/              schema, migrations, and seed tasks
test/                end-to-end tests
```

## Notes for Contributors

- `src/main.ts` is the canonical place to check app-level middleware, validation, and API docs setup
- `src/app.module.ts` shows what the app depends on and in what order modules are wired
- when adding or changing a public endpoint, update the matching API docs decorators and tests together
- when changing auth or file flows, check the relevant queue, storage, and token repositories as well as the service layer

## Production Deployment (Render)

If you use BullMQ for email/PDF jobs, deploy **three runtime services** on Render:

- one **Web Service** for the API
- one **Background Worker** for queue processing
- one **Redis** instance

No worker URL is required. The API and worker communicate through Redis queues.

### 1. Create/keep Redis

1. In Render, create a Redis instance (or keep your existing one).
2. Note Redis host and port from Render.

### 2. Configure the API Web Service

1. Open your current API service.
2. Make sure it builds from repo root with `Dockerfile`.
3. Keep API start as production app (`node dist/src/main`, already in Dockerfile `CMD`).
4. Set environment variables.

Required minimum for API:

- `DATABASE_URL`
- `REDIS_HOST`
- `REDIS_PORT`
- all other required variables from `src/infrastructure/config/env.schema.ts` (`SMTP_*`, `R2_*`, `JWT_*`, `FRONTEND_URL`, etc.)

Notes:

- API container runs Prisma migrations on startup via Dockerfile command.
- Keep migrations in API only; do not run them in worker.

### 3. Create a Worker Background Service

1. In Render, click **New +** -> **Background Worker**.
2. Select the same repository and branch as the API.
3. Set Dockerfile path to `Dockerfile.worker`.
4. Worker command is already in Dockerfile: `node dist/src/worker`.
5. Add environment variables.

Required minimum for worker:

- `DATABASE_URL`
- `REDIS_HOST`
- `REDIS_PORT`
- `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`
- same required app config values used by loaded modules (`SMTP_*`, `R2_*`, `JWT_*`, etc.)

### 4. Verify both services use the same infrastructure

1. API and worker must point to the same Redis.
2. API and worker must point to the same Postgres database.
3. Deploy API and worker.

### 5. Smoke test after deploy

1. Call an endpoint that triggers PDF generation.
2. In API logs, confirm job enqueue/wait behavior.
3. In worker logs, confirm:
   - `Processing PDF job ...`
   - `Completed PDF job ...`
4. If API times out waiting for a PDF, worker is not running or is connected to different Redis.

### 6. Common Render mistakes

- Deploying only API + Redis, but no worker service
- Worker using different Redis host/port than API
- Missing required env vars on worker (schema validation fails at boot)
- Running migrations from worker too (unnecessary/risky)

### 7. Demo endpoint for worker verification

A JWT-protected demo route is available to verify API -> Redis -> worker -> PDF end-to-end:

- `GET /api/v1/demo/pdf`
- optional query: `title`

Example:

```bash
curl -L --request GET \
  --url 'https://YOUR_RENDER_API_DOMAIN/api/v1/demo/pdf?title=Render%20Worker%20Check' \
  --header 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  --output demo.pdf
```

If successful, `demo.pdf` is downloaded and worker logs show PDF job processing/completion.
