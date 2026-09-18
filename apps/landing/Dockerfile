FROM node:20-bookworm-slim

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV CI=true

RUN corepack enable && corepack prepare pnpm@8.15.4 --activate

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/landing/package.json apps/landing/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/utils/package.json packages/utils/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN pnpm install --frozen-lockfile

COPY apps/landing apps/landing
COPY packages packages

ARG API_BASE_URL
ARG CRM_URL
ARG NEXT_PUBLIC_API_URL
ARG SITE_URL
ARG ENABLE_HSTS=false
ENV API_BASE_URL=$API_BASE_URL
ENV CRM_URL=$CRM_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV SITE_URL=$SITE_URL
ENV ENABLE_HSTS=$ENABLE_HSTS

RUN pnpm --filter @viviani/types build \
  && pnpm --filter @viviani/utils build \
  && pnpm --filter @viviani/ui build \
  && pnpm --filter @viviani/landing build

EXPOSE 3000

CMD ["pnpm", "--filter", "@viviani/landing", "start"]
