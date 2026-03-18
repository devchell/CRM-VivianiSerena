# CHANGELOG_REFACTOR

## O que foi alterado

- Criada uma camada canonica de metricas em `apps/api/src/domain/metrics/service.ts`.
- Adicionado endpoint consolidado `GET /api/v1/metrics/overview`.
- Dashboard do CRM refeito para consumir apenas metricas consolidadas.
- Financeiro do CRM refeito para usar contratos canonicos de resumo, graficos e categorias.
- Agenda do CRM alinhada ao contrato real de appointments da API.
- Landing ajustada para enviar leads por um unico fluxo de persistencia.
- Middleware de autenticacao ajustado para aceitar bearer token e cookie.
- Publicacao de conteudo da landing centralizada em `POST /api/v1/content/publish`.
- `NEXTAUTH_SECRET` removido do bundle client do CRM.
- Health endpoints adicionados em `/health/live` e `/health/ready`.
- `.env.example` e `README.md` reescritos com foco em operacao fora do PC local.

## O que foi removido

- Fallbacks com `Math.random()` no dashboard do CRM.
- Dados mockados no sino de notificacoes.
- Revalidacao client-side com segredo publico no CRM.
- Duplicidade de criacao de leads entre analytics e submit real da landing.

## O que foi reescrito

- `apps/crm/src/app/(dashboard)/dashboard/page.tsx`
- `apps/crm/src/app/(dashboard)/financeiro/page.tsx`
- `apps/crm/src/app/(dashboard)/agenda/page.tsx`
- `apps/crm/src/components/dashboard/StatsCards.tsx`
- `apps/crm/src/components/dashboard/RevenueChart.tsx`
- `apps/crm/src/components/dashboard/LeadsFunnel.tsx`
- `apps/crm/src/components/dashboard/RecentActivity.tsx`
- `apps/landing/src/components/LeadFormSection.tsx`
- `apps/landing/src/lib/analytics.ts`
- `apps/api/src/routes/users.ts`
- `apps/api/src/routes/content.ts`
- `apps/api/src/routes/financials.ts`
- `apps/api/src/routes/leads.ts`
- `apps/api/src/routes/appointments.ts`
- `apps/api/src/routes/analytics.ts`
- `apps/api/src/routes/dashboard.ts`
- `apps/api/src/routes/metrics.ts`

## Riscos remanescentes

- Uploads ainda usam disco local; para producao 24/7, migrar para object storage.
- Historico do editor de conteudo segue com stub local e precisa de versao persistida.
- Notificacoes ainda estao neutras; se forem necessarias, devem nascer da mesma trilha operacional canonica.
- Existem arquivos legados ainda nao removidos para evitar exclusao destrutiva nesta fase.
- Observabilidade existe de forma basica; tracing e alertas externos ainda dependem de infraestrutura gerenciada.

## Pendencias

- Migrar uploads para S3/R2 equivalente.
- Implantar Redis e Postgres gerenciados no ambiente alvo.
- Fechar CI/CD com migrate, smoke test e rollback automatizado.
- Revisar e remover arquivos legados restantes com validacao manual.
- Adicionar testes automatizados de consistencia cruzada para metricas.
