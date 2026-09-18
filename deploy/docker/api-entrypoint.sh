#!/bin/sh
set -eu

echo "Applying Prisma migrations..."

RUNTIME_DATABASE_URL="$DATABASE_URL"
RUNTIME_DIRECT_DATABASE_URL="${DIRECT_DATABASE_URL:-$DATABASE_URL}"
if [ -n "${MIGRATION_DATABASE_URL:-}" ]; then
  export DATABASE_URL="$MIGRATION_DATABASE_URL"
  export DIRECT_DATABASE_URL="$MIGRATION_DATABASE_URL"
fi

if [ "${FRESH_DATABASE:-false}" = "true" ] && [ ! -f /app/data/.schema-baselined ]; then
  if [ "${ALLOW_FRESH_BOOTSTRAP:-false}" != "true" ]; then
    echo "Refusing fresh database bootstrap: set ALLOW_FRESH_BOOTSTRAP=true for an explicit one-time initialization."
    exit 1
  fi
  echo "Bootstrapping the requested fresh database from the current Prisma schema..."
  pnpm --filter @viviani/api db:push --accept-data-loss

  # The repository begins with feature migrations but no historical init migration.
  # The schema was just created from zero, so record those migrations as the baseline.
  for migration in \
    20260319151500_two_factor_channels \
    20260319213000_email_settings \
    20260323120000_appointment_duration_minutes \
    20260323200000_add_lead_status_templates
  do
    pnpm --filter @viviani/api exec prisma migrate resolve --rolled-back "$migration" >/dev/null 2>&1 || true
    pnpm --filter @viviani/api exec prisma migrate resolve --applied "$migration"
  done

  touch /app/data/.schema-baselined
  echo "Fresh database baseline recorded."
fi

pnpm --filter @viviani/api db:migrate:prod

export DATABASE_URL="$RUNTIME_DATABASE_URL"
export DIRECT_DATABASE_URL="$RUNTIME_DIRECT_DATABASE_URL"
unset MIGRATION_DATABASE_URL

if [ "${SEED_ON_START:-false}" = "true" ]; then
  echo "Running idempotent baseline seed..."
  pnpm --filter @viviani/api db:seed
fi

exec node apps/api/dist/server.js
