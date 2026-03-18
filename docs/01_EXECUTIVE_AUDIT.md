# 01 Executive Audit

## Escopo e contexto
- Auditoria realizada em `2026-03-18` sobre o estado atual do monorepo.
- Esta fase foi restrita a leitura, entendimento, diagnostico, validacao basica de build e documentacao.
- O repositorio esta com alteracoes locais e arquivos nao rastreados; os achados refletem o workspace inspecionado, nao um release congelado.

## Resumo executivo
O projeto tem base tecnica suficiente para evoluir para uma operacao 24/7, mas hoje ainda nao sustenta deploy profissional com previsibilidade. O principal problema nao e apenas infraestrutura local em Docker. O problema central e a falta de um desenho canonico entre dominios, contratos e metricas.

Hoje existem multiplas superficies exibindo numeros operacionais e comerciais com regras diferentes: dashboard principal, modulo de leads, modulo financeiro, analytics, seguranca, widgets, cards, graficos, tabelas, notificacoes e componentes com fallback local. Em paralelo, ha contratos quebrados entre front-end e back-end em fluxos criticos, segredos expostos, autorizacao administrativa fragil e partes importantes sem build verde.

Em outras palavras: a migracao para ambiente gerenciado e possivel, mas nao deve acontecer antes de uma etapa curta de estabilizacao estrutural. Caso contrario, a nova infraestrutura apenas hospedara os mesmos erros com mais custo e menor capacidade de diagnostico.

## Stack detectada
- Monorepo com `pnpm workspaces` e `turbo`
- `apps/landing`: Next.js 14 App Router, Tailwind, Framer Motion
- `apps/crm`: Next.js 14 App Router, NextAuth v5 beta, Tailwind, Recharts, FullCalendar, Tiptap
- `apps/api`: Express 5 beta, TypeScript, Prisma 5
- Banco principal: PostgreSQL
- Cache, sessoes e tokens: Redis
- Realtime: Socket.IO
- Jobs agendados: `node-cron`
- Uploads: `multer` + `sharp` com persistencia em filesystem local
- Infra local: Docker Compose + Nginx
- Build/release observado: GitHub Actions com cobertura parcial

## Situacao atual
- `landing` builda.
- `api` nao builda.
- `crm` nao builda.
- Existe desalinhamento entre UI e API em `leads`, `agenda`, `financeiro`, `content` e `auth`.
- Ha metricas oficiais, metricas estimadas, mocks e fallbacks visuais misturados sem marcacao clara.
- O sistema nao possui fonte unica da verdade para KPIs e agregados.
- Analytics esta contaminando o dominio comercial ao criar leads sinteticos.
- O dominio financeiro tenta derivar indicador comercial sem vinculo transacional confiavel.
- A camada de seguranca existe, mas parte dela e apenas parcial, simulada ou inconsistente com o discurso do produto.

## Superficies que hoje exibem metricas

### Operacionais e comerciais
- Dashboard principal do CRM
- Cards de KPI
- Funil de leads
- Tabela e cards do modulo de leads
- Tabela e cards do modulo de agenda
- Modulo de analytics

### Financeiras
- Cards de resumo financeiro
- Graficos mensais
- Tabelas de lancamentos
- Distribuicao por categoria

### Seguranca e atividade
- Dashboard de seguranca
- Checklist e score
- Recent activity
- Notification bell e feed de notificacoes

O problema nao esta apenas no numero final. Cada uma dessas superficies pode estar consumindo fonte, filtro, cache ou fallback diferente.

## Principais riscos

### Alta prioridade
- Segredos expostos em `.env` versionados e duplicados em apps.
- `NEXTAUTH_SECRET` injetado no bundle do cliente em `apps/crm/next.config.mjs`.
- `adminOnly` sem efeito real em `apps/api/src/routes/users.ts`.
- Fluxo principal de lead da landing nao respeita o contrato exigido pela API.
- Agenda do CRM usa contrato diferente do backend.
- Financeiro e backend nao compartilham o mesmo vocabulario de categorias e estruturas de agregacao.
- Dashboard mistura dados reais, dados sinteticos e componentes com fallback aleatorio.
- Analytics cria leads sinteticos dentro do dominio comercial.
- Uploads em disco local impedem arquitetura escalavel e segura.
- `api` e `crm` sem build verde.

### Media prioridade
- Cache de metricas sem invalidacao orientada a dominio.
- Refresh de autenticacao com contratos diferentes entre CRM e API.
- Rotas antigas ou duplicadas de conteudo.
- Jobs, websocket e uploads acoplados ao processo web principal.
- Ausencia de testes de contrato e consistencia de KPI.

### Baixa prioridade
- Dependencias possivelmente ociosas.
- Componentes placeholder em notificacoes, atividade e seguranca.
- Acumulacao de legado ainda nao removido.

## Principais gargalos
- Ausencia de contratos canonicos entre front-end e back-end
- Ausencia de catalogo oficial de KPI e agregados
- Mistura de dominios: analytics, comercial e financeiro
- Seguranca de aplicacao e segredos abaixo do minimo aceitavel
- Dependencia de estado local do host para uploads e logs
- Pipeline de build/release incompleto
- Baixa observabilidade para uma operacao 24/7

## Prioridade por area

### Alta
1. Seguranca, segredos e autorizacao.
2. Build verde de `api` e `crm`.
3. Contratos canonicos de `lead`, `appointment`, `financial summary` e `auth`.
4. Fonte unica da verdade para metricas por dominio.
5. Separacao de analytics e CRM comercial.

### Media
1. Padronizacao de cache e invalidacao por evento de dominio.
2. Migracao de uploads para storage gerenciado.
3. Separacao de processo web, jobs e realtime.
4. Observabilidade e operacao.

### Baixa
1. Limpeza de legado e codigo morto.
2. Revisao de dependencias ociosas.
3. Refinos de UX nao estruturais.

## Estimativa qualitativa de esforco
- Seguranca e segredos: alto
- Contratos entre modulos: alto
- Fonte unica da verdade e metricas: alto
- Migracao para arquitetura 24/7: alto
- Uploads e storage: medio
- Observabilidade e operacao: medio
- Limpeza de legado: medio
- Ajustes cosmeticos: baixo

## Evidencias objetivas relevantes
- `pnpm --filter @viviani/api build`: falha
- `pnpm --filter @viviani/crm build`: falha
- `pnpm --filter @viviani/landing build`: sucesso
- `apps/api/src/routes/users.ts`: autorizacao administrativa inexistente na pratica
- `apps/landing/src/components/LeadFormSection.tsx` x `apps/api/src/routes/leads.ts`: contrato quebrado
- `apps/crm/src/app/(dashboard)/agenda/page.tsx` x `apps/api/src/routes/appointments.ts`: contrato quebrado
- `apps/crm/src/app/(dashboard)/financeiro/page.tsx` x `apps/api/src/routes/financials.ts` x `apps/api/prisma/schema.prisma`: contrato quebrado
- `apps/api/src/routes/analytics.ts`: criacao de lead sintetico para tracking
- `apps/crm/src/components/dashboard/RevenueChart.tsx` e `apps/crm/src/components/dashboard/LeadsFunnel.tsx`: fallback aleatorio em superficie operacional

## Conclusao
O projeto precisa de uma estabilizacao orientada a dominio antes da migracao final. O eixo central dessa estabilizacao e:
- definir fonte unica da verdade por dominio;
- alinhar contratos e nomenclaturas;
- remover dados sinteticos e mocks de superficies oficiais;
- corrigir seguranca e build;
- entao mover cada responsabilidade para a arquitetura gerenciada apropriada.
