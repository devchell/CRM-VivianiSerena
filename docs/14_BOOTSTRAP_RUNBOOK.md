# 14 Bootstrap Runbook

## Objetivo
Subir o projeto localmente com o minimo de atrito.

## Pre-requisitos
- Node `20.20.1`
- pnpm `8.x`
- PostgreSQL
- Redis

## Passos
1. Instalar dependencias:
   - `nvm use`
   - `pnpm install`
2. Configurar `.env` por app.
3. Gerar Prisma client:
   - `pnpm --filter @viviani/api db:generate`
4. Aplicar schema local:
   - `pnpm --filter @viviani/api db:push`
5. Popular base local se necessario:
   - `pnpm --filter @viviani/api db:seed`
6. Subir apps:
   - `pnpm --filter @viviani/api dev`
   - `pnpm --filter @viviani/crm dev`
   - `pnpm --filter @viviani/landing dev`

## Validacao inicial
- abrir landing;
- abrir CRM;
- logar com usuario de seed;
- validar `health` da API.
