# ============================================================
# API Dockerfile - Multi-stage build
# ============================================================

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
RUN npm install -g pnpm@8.15.4
WORKDIR /app

# ============================================================
# Dependencies stage
# ============================================================
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/config/package.json ./packages/config/
RUN pnpm install --frozen-lockfile

# ============================================================
# Builder stage
# ============================================================
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @viviani/config build 2>/dev/null || true
RUN pnpm --filter @viviani/types build
RUN pnpm --filter @viviani/utils build
RUN pnpm --filter @viviani/api run db:generate
RUN pnpm --filter @viviani/api build

# ============================================================
# Production stage
# ============================================================
FROM base AS production
ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && adduser -S viviani -u 1001
WORKDIR /app

COPY --from=builder --chown=viviani:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=viviani:nodejs /app/apps/api/package.json .
COPY --from=builder --chown=viviani:nodejs /app/apps/api/prisma ./prisma
COPY --from=builder --chown=viviani:nodejs /app/node_modules ./node_modules

RUN mkdir -p uploads logs && chown -R viviani:nodejs uploads logs

USER viviani
EXPOSE 4000
CMD ["node", "dist/server.js"]

# ============================================================
# Development stage
# ============================================================
FROM base AS development
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 4000
CMD ["pnpm", "--filter", "@viviani/api", "dev"]
