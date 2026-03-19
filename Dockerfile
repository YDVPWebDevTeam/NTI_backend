FROM node:22-alpine AS builder

WORKDIR /app

# Suppress husky install in CI/Docker (no .git directory)
ENV HUSKY=0

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /app/dist ./dist

EXPOSE 3001

CMD ["node", "dist/src/main"]
