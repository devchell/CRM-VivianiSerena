# 02 System Map

## Data de referencia
- Atualizado em `2026-03-20`.
- Reflete o codigo do monorepo em `staging`.

## Monorepo

```text
apps/
  api/       -> backend principal (Express + Prisma + Redis + Socket.IO)
  crm/       -> painel autenticado (Next.js 14 + NextAuth)
  landing/   -> site publico e captura de leads (Next.js 14)
packages/
  types/     -> contratos, perfis, permissoes e tipos de dominio
  utils/     -> formatacao e utilitarios compartilhados
  ui/        -> componentes compartilhados
docs/        -> auditoria, operacao e arquitetura
infra/       -> Docker legados e Nginx de referencia
```

## Modulos reais

### API
- Auth, refresh token e 2FA.
- Leads.
- Agenda / appointments.
- Financeiro.
- Conteudo e uploads.
- Seguranca e privacidade.
- Colaboradores e administracao.
- Analytics e metricas consolidadas.

### CRM
- `dashboard`
- `leads`
- `agenda`
- `financeiro`
- `editar-site`
- `seguranca`
- `colaboradores`
- `administracao`
- `configuracoes`

### Landing
- Conteudo publicado pelo CMS.
- Captura publica de leads.
- Tracking de analytics e web vitals.
- Exibicao opcional de prova social e reviews do Google Business.

## Persistencia principal
- `users`: autenticacao, perfil, modulos e 2FA.
- `leads`: captura comercial.
- `appointments`: agenda e referencia opcional ao Google Calendar por `google_event_id`.
- `financials`: lancamentos financeiros.
- `contents` e `content_versions`: CMS e historico.
- `security_events` e `audit_logs`: trilha operacional.
- `sessions`, `analytics_events`, `web_vitals`: analytics.
- `consent_logs`: trilha LGPD da captura publica de leads.

## Integracoes reais

### Google Calendar
- Implementacao existe no backend com OAuth, token em Redis, refresh e CRUD de eventos.
- Rota de autorizacao: `GET /api/v1/auth/google`.
- Callback: `GET /api/v1/auth/google/callback`.
- Status atual de homologacao em `2026-03-20`: nao configurado e nao conectado.

### Google Business Profile
- Implementacao existe no backend e reaproveita o mesmo OAuth do Google.
- Endpoints administrativos:
  - `GET /api/v1/admin/google-business/locations`
  - `POST /api/v1/admin/google-business/reviews`
- Consumo publico: `GET /api/v1/content/site-summary`.
- Quando o OAuth Google nao estiver pronto, os endpoints administrativos falham de forma explicita com `400` (nao configurado) ou `409` (nao conectado).
- Status atual de homologacao em `2026-03-20`: estrutura pronta, mas sem localizacoes vinculadas e sem reviews carregados.

### Uploads
- Driver `local` por padrao.
- Suporte a `s3` implementado via `STORAGE_DRIVER=s3`.
- Health de uploads exposto em `admin/overview` e `health/deps`.

### WhatsApp Business
- Integracao oficial via Meta WhatsApp Business Platform.
- Conexao do canal feita no CRM por Embedded Signup, sem WhatsApp Web e sem sessao local.
- Endpoints:
  - `POST /api/v1/admin/whatsapp/connect`
  - `DELETE /api/v1/admin/whatsapp/connect`
  - `GET /api/v1/admin/whatsapp/status`
  - `GET /api/v1/whatsapp/webhook`
  - `POST /api/v1/whatsapp/webhook`
- Envio operacional do modulo `Disparos` usa `phoneNumberId` conectado e registra logs em `DispatchRecipient` / `DispatchReceipt`.

## Fonte de verdade por modulo
- Dashboard: `apps/api/src/domain/metrics/service.ts`
- Leads: `apps/api/src/routes/leads.ts` + tabela `leads`
- Consentimento LGPD de leads: `apps/api/src/routes/leads.ts` + `apps/api/src/routes/privacy.ts` + tabela `consent_logs`
- Agenda: `apps/api/src/routes/appointments.ts` + tabela `appointments`
- Financeiro: `apps/api/src/routes/financials.ts` + tabela `financials`
- Conteudo da landing: `apps/api/src/routes/content.ts` + `contents`
- Seguranca: `apps/api/src/routes/security.ts` + `security_events`
- Colaboradores e administracao: `apps/api/src/routes/users.ts` + `apps/api/src/routes/admin.ts`
