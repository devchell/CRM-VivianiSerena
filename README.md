# Viviani Serena Platform

Monorepo com `landing`, `crm`, `api` e pacotes compartilhados para operacao comercial, agenda, financeiro e gestao de conteudo.

## Estado atual

- `@viviani/types`, `@viviani/api`, `@viviani/crm` e `@viviani/landing` com build verde.
- Dashboard, financeiro e agenda do CRM agora usam contratos canonicos da API.
- Landing cria lead em um unico fluxo de persistencia e separa tracking de analytics.
- Captura publica de lead registra `lead.consentedAt` e `consent_logs` com IP anonimizado.
- Operacao de leads no CRM usa filtros, cards e exportacao sobre a mesma base canonica de `GET /api/v1/leads` e `GET /api/v1/leads/stats`.
- CRM agora possui `Leads > Disparos` com segmentacao operacional, rascunhos, limites diarios e historico sobre a mesma base canonica de leads.
- Segredos client-side removidos do CRM para publicacao da landing.
- Google Calendar e Google Business Profile existem no codigo, mas a homologacao auditada em `2026-03-20` segue sem OAuth Google configurado.
- A pasta [`docs`](D:/VivianeCRM/viviani-serena-platform/docs) continua como base de auditoria e arquitetura.
- A API agora possui job versionado de deploy em homologacao via Render Deploy Hook.

## Homologacao ativa

- landing: `https://landing-hml.vercel.app`
- crm: `https://crm-hml.vercel.app`
- api: `https://api-hml-sbk3.onrender.com`
- login demo admin: `admin@vivianiserena.com` / `Teste123`
- login demo colaborador: `colaborador@vivianiserena.com` / `Teste123`
- producao esta desativada de proposito enquanto a validacao com a cliente nao terminar

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

- Node.js 20.20.1
- pnpm 8+
- acesso ao GitHub
- contas na Vercel e na Render
- PostgreSQL e Redis gerenciados
- Docker apenas como opcao legada de dev

## Setup de codigo

1. Instale dependencias:

```bash
nvm use
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
- trilha LGPD de leads sai de `POST /api/v1/leads` e `GET /api/v1/privacy/export`
- disparos operacionais saem de `GET/PUT /api/v1/dispatches/*`

Detalhes: [04_SINGLE_SOURCE_OF_TRUTH_PLAN.md](D:/VivianeCRM/viviani-serena-platform/docs/04_SINGLE_SOURCE_OF_TRUTH_PLAN.md)
Runbook: [20_DISPATCHES_OPERATIONAL_RUNBOOK.md](D:/VivianeCRM/viviani-serena-platform/docs/20_DISPATCHES_OPERATIONAL_RUNBOOK.md)

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

- projetos ja criados na Vercel:
  - `landing-hml`
  - `landing-prod`
  - `crm-hml`
  - `crm-prod`
- homologacao ativa:
  - `landing-hml -> https://landing-hml.vercel.app`
  - `crm-hml -> https://crm-hml.vercel.app`
- `landing-prod` e `crm-prod` existem, mas ficaram desligados do Git para evitar deploy acidental
- a homologacao do frontend foi publicada manualmente a partir desta base
- o workflow `.github/workflows/deploy-homolog.yml` continua pronto caso voce queira ativar deploy automatizado depois com `VERCEL_TOKEN`

### Backend

- homologacao ativa:
  - `api-hml -> https://api-hml-sbk3.onrender.com`
- producao da API esta desligada no momento
- publicar `apps/api` em plataforma com processo persistente
- exemplo de blueprint para Render: [render.yaml](D:/VivianeCRM/viviani-serena-platform/render.yaml)
- job versionado de homologacao da API no workflow [deploy-homolog.yml](D:/VivianeCRM/viviani-serena-platform/.github/workflows/deploy-homolog.yml)
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
- `STORAGE_DRIVER`
- `UPLOAD_PUBLIC_BASE_URL` when `STORAGE_DRIVER=s3`
- `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`

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
- [14_BOOTSTRAP_RUNBOOK.md](D:/VivianeCRM/viviani-serena-platform/docs/14_BOOTSTRAP_RUNBOOK.md)
- [17_GOOGLE_INTEGRATIONS_RUNBOOK.md](D:/VivianeCRM/viviani-serena-platform/docs/17_GOOGLE_INTEGRATIONS_RUNBOOK.md)
- [18_API_DEPLOY_TRACEABILITY.md](D:/VivianeCRM/viviani-serena-platform/docs/18_API_DEPLOY_TRACEABILITY.md)
- [19_LEADS_OPERATIONAL_AUDIT_2026-03-20.md](D:/VivianeCRM/viviani-serena-platform/docs/19_LEADS_OPERATIONAL_AUDIT_2026-03-20.md)
- [11_MIGRATION_RUNBOOK.md](D:/VivianeCRM/viviani-serena-platform/docs/11_MIGRATION_RUNBOOK.md)
- [12_OPERATIONS_AND_MONITORING.md](D:/VivianeCRM/viviani-serena-platform/docs/12_OPERATIONS_AND_MONITORING.md)
- [16_AUDIT_STATUS_2026-03-20.md](D:/VivianeCRM/viviani-serena-platform/docs/16_AUDIT_STATUS_2026-03-20.md)
- [DEPLOY_CHECKLIST_FINAL.md](D:/VivianeCRM/viviani-serena-platform/DEPLOY_CHECKLIST_FINAL.md)

## Refatoracao

Resumo desta fase: [CHANGELOG_REFACTOR.md](D:/VivianeCRM/viviani-serena-platform/CHANGELOG_REFACTOR.md)
