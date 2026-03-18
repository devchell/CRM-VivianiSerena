# Viviani Serena Platform

Monorepo com `landing`, `crm`, `api` e pacotes compartilhados para operacao comercial, agenda, financeiro e gestao de conteudo.

## Estado atual

- `@viviani/types`, `@viviani/api`, `@viviani/crm` e `@viviani/landing` com build verde.
- Dashboard, financeiro e agenda do CRM agora usam contratos canonicos da API.
- Landing cria lead em um unico fluxo de persistencia e separa tracking de analytics.
- Segredos client-side removidos do CRM para publicacao da landing.
- A pasta [`docs`](D:/VivianeCRM/viviani-serena-platform/docs) continua como base de auditoria e arquitetura.

## Apps

- `apps/landing`: site publico em Next.js 14
- `apps/crm`: front interno em Next.js 14 + NextAuth
- `apps/api`: API Express 5 + Prisma
- `packages/types`: contratos compartilhados
- `packages/utils`: utilitarios compartilhados
- `packages/ui`: componentes compartilhados

## Arquitetura recomendada

- `landing` em Vercel
- `crm` em Vercel
- `api` em container gerenciado com processo persistente
- PostgreSQL gerenciado
- Redis gerenciado
- storage de uploads em object storage
- observabilidade centralizada para logs, metricas e tracing

Detalhes: [08_DEPLOYMENT_ARCHITECTURE.md](D:/VivianeCRM/viviani-serena-platform/docs/08_DEPLOYMENT_ARCHITECTURE.md)

## Pre-requisitos

- Node.js 20+
- pnpm 8+
- acesso ao GitHub
- contas na Vercel e na Render
- PostgreSQL e Redis gerenciados
- Docker apenas como opcao legada de dev

## Setup de codigo

1. Instale dependencias:

```bash
pnpm install
```

2. Use o template remoto de ambiente como referencia:

```bash
cp .env.example .env
```

3. Se quiser validar build antes do push:

```bash
pnpm build:release
```

4. Publique seguindo o guia:

- [upload-sistema.md](./upload-sistema.md)

## Scripts uteis

```bash
pnpm --filter @viviani/types build
pnpm --filter @viviani/api build
pnpm --filter @viviani/crm build
pnpm --filter @viviani/landing build
```

```bash
pnpm --filter @viviani/api dev
pnpm --filter @viviani/crm dev
pnpm --filter @viviani/landing dev
```

## Fonte unica de verdade

- KPIs operacionais saem de `apps/api/src/domain/metrics/service.ts`
- overview consolidado sai de `GET /api/v1/metrics/overview`
- dashboard e financeiro do CRM consomem essa camada canonica
- tracking da landing nao cria mais leads paralelos

Detalhes: [04_SINGLE_SOURCE_OF_TRUTH_PLAN.md](D:/VivianeCRM/viviani-serena-platform/docs/04_SINGLE_SOURCE_OF_TRUTH_PLAN.md)

## Seguranca

- `adminOnly` reativado com checagem real de papel
- `NEXTAUTH_SECRET` removido do bundle client do CRM
- publicacao da landing passa por endpoint autenticado do backend
- auth middleware aceita bearer token e cookie `access_token`

Detalhes: [05_SECURITY_BASELINE.md](D:/VivianeCRM/viviani-serena-platform/docs/05_SECURITY_BASELINE.md)

## Checklist de execucao local

- `pnpm install`
- `.env` preenchido sem segredos placeholder
- PostgreSQL acessivel
- Redis acessivel
- `pnpm --filter @viviani/api db:generate`
- `pnpm --filter @viviani/api db:migrate`
- `pnpm --filter @viviani/types build`
- `pnpm --filter @viviani/api build`
- `pnpm --filter @viviani/crm build`
- `pnpm --filter @viviani/landing build`

## Checklist de deploy

- variaveis de ambiente separadas por app e ambiente
- `DATABASE_URL` e `REDIS_URL` gerenciados
- migrations executadas antes da troca de versao
- `LANDING_REVALIDATE_URL` e `REVALIDATE_SECRET` configurados apenas no backend
- `CRM_URL` configurado na landing e na API
- `API_BASE_URL` configurado com URL remota real
- logs e health checks monitorados
- rollback definido para app e banco

## Deploy real

### Frontend

- publicar `apps/landing` na Vercel
- publicar `apps/crm` na Vercel
- configurar o root directory de cada projeto no app correto
- definir as variaveis de ambiente do app no painel da Vercel

### Backend

- publicar `apps/api` em plataforma com processo persistente
- exemplo de blueprint para Render: [render.yaml](D:/VivianeCRM/viviani-serena-platform/render.yaml)
- health checks disponiveis:
  - `GET /health/live`
  - `GET /health/ready`
  - `GET /health/deps`

Guia completo de subida e publicacao: [upload-sistema.md](./upload-sistema.md)

### Ordem recomendada

1. Provisionar Postgres, Redis e storage.
2. Configurar variaveis da API.
3. Executar migrations.
4. Publicar a API.
5. Validar `health/live` e `health/ready`.
6. Publicar landing.
7. Publicar CRM.
8. Rodar smoke tests.

### Variaveis minimas por app

API:
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_PRIVATE_KEY`
- `JWT_PUBLIC_KEY`
- `NEXTAUTH_SECRET`
- `ENCRYPTION_KEY`
- `ANONYMIZATION_SALT`
- `CORS_ORIGIN`
- `CRM_URL`
- `API_BASE_URL`
- `LANDING_REVALIDATE_URL`
- `REVALIDATE_SECRET`

Landing:
- `API_BASE_URL`
- `NEXT_PUBLIC_API_URL`
- `CRM_URL`
- `NEXT_PUBLIC_GA_ID`
- `REVALIDATE_SECRET`

CRM:
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `API_BASE_URL`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_LANDING_URL`

### Rollback

- rollback de landing e CRM pelo deploy anterior na Vercel
- rollback da API pela release anterior do provider
- restore de banco somente com snapshot ou dump validado
- detalhes operacionais em [DEPLOY_CHECKLIST_FINAL.md](D:/VivianeCRM/viviani-serena-platform/DEPLOY_CHECKLIST_FINAL.md)

## Documentos principais

- [01_EXECUTIVE_AUDIT.md](D:/VivianeCRM/viviani-serena-platform/docs/01_EXECUTIVE_AUDIT.md)
- [04_SINGLE_SOURCE_OF_TRUTH_PLAN.md](D:/VivianeCRM/viviani-serena-platform/docs/04_SINGLE_SOURCE_OF_TRUTH_PLAN.md)
- [05_SECURITY_BASELINE.md](D:/VivianeCRM/viviani-serena-platform/docs/05_SECURITY_BASELINE.md)
- [08_DEPLOYMENT_ARCHITECTURE.md](D:/VivianeCRM/viviani-serena-platform/docs/08_DEPLOYMENT_ARCHITECTURE.md)
- [13_ENVIRONMENT_STRATEGY.md](D:/VivianeCRM/viviani-serena-platform/docs/13_ENVIRONMENT_STRATEGY.md)
- [11_MIGRATION_RUNBOOK.md](D:/VivianeCRM/viviani-serena-platform/docs/11_MIGRATION_RUNBOOK.md)
- [12_OPERATIONS_AND_MONITORING.md](D:/VivianeCRM/viviani-serena-platform/docs/12_OPERATIONS_AND_MONITORING.md)
- [DEPLOY_CHECKLIST_FINAL.md](D:/VivianeCRM/viviani-serena-platform/DEPLOY_CHECKLIST_FINAL.md)

## Refatoracao

Resumo desta fase: [CHANGELOG_REFACTOR.md](D:/VivianeCRM/viviani-serena-platform/CHANGELOG_REFACTOR.md)
