# NTI Backend

NestJS backend with PostgreSQL, Redis, Prisma ORM, and BullMQ.

## Prerequisites

- Node.js 22+
- npm
- Docker & Docker Compose (for containerized setup)

## Environment Setup

Copy the example env file and adjust values if needed:

```bash
cp .env.example .env
```

`.env` variables:

| Variable       | Default                                                         | Description             |
| -------------- | --------------------------------------------------------------- | ----------------------- |
| `PORT`         | `3001`                                                          | HTTP port               |
| `NODE_ENV`     | `development`                                                   | Environment             |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/nti_db?schema=public` | PostgreSQL connection   |
| `REDIS_HOST`   | `localhost`                                                     | Redis host              |
| `REDIS_PORT`   | `6379`                                                          | Redis port              |

## Docker Compose

Starts the app, PostgreSQL, and Redis together. Migrations run automatically.

```bash
docker compose up
```

The API will be available at `http://localhost:3001`.

## Useful Commands

```bash
# Open Prisma Studio (database browser)
npm run prisma:studio

# Reset database and re-run migrations
npm run prisma:reset

# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e

# Lint
npm run lint
```

## API Documentation

Swagger UI is available at `http://localhost:3001/api/docs`.
