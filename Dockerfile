# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Single multi-stage Dockerfile for the API (`production`), the queue worker
# (`worker`) and local development (`dev`). Build a specific stage with:
#   docker build --target production .
#   docker build --target worker     .
#   docker build --target dev        .
# ---------------------------------------------------------------------------

# --- Base: shared runtime settings -----------------------------------------
FROM node:22-bookworm-slim AS base
WORKDIR /app
# Husky has no .git in the image; Puppeteer uses the system Chromium.
ENV HUSKY=0 \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# --- Chromium: layer reused by every stage that runs Puppeteer --------------
FROM base AS chromium
RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium fonts-liberation ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM deps AS builder
COPY . .
RUN npx prisma generate && npm run build

# --- Production deps: prod-only modules for a slim runtime ------------------
FROM base AS prod-deps
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# --- Development: full toolchain + Chromium; source is bind-mounted ---------
# Used by docker-compose. node_modules and the Prisma client are baked in so
# the container starts without a runtime `npm install`.
FROM chromium AS dev
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
EXPOSE 3001
CMD ["npm", "run", "start:dev"]

FROM chromium AS runtime
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/generated ./generated
COPY package*.json ./
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

FROM runtime AS worker
CMD ["node", "dist/src/worker"]

# --- Production (API): MUST stay the LAST stage -----------------------------
# Render (and `docker build` with no --target) builds the last stage, so the
# API is the default target and binds the HTTP port without any override.
FROM runtime AS production
EXPOSE 3001
CMD ["sh", "-c", "DATABASE_URL=${DIRECT_URL:-$DATABASE_URL} npx prisma migrate deploy && node dist/src/main"]
