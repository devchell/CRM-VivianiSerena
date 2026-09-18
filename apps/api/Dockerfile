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
COPY apps/api/package.json apps/api/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/utils/package.json packages/utils/package.json

RUN pnpm install --frozen-lockfile

COPY apps/api apps/api
COPY packages packages
COPY deploy deploy

RUN cd apps/api \
  && pnpm exec prisma generate --schema=prisma/schema.prisma \
  && cd /app \
  && pnpm --filter @viviani/types build \
  && pnpm --filter @viviani/utils build \
  && pnpm --filter @viviani/api build

EXPOSE 4000

CMD ["/bin/sh", "/app/deploy/docker/api-entrypoint.sh"]
