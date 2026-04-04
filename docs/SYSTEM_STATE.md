# SYSTEM_STATE — VivianiCRM

> **Versão:** 2.0  
> **Data:** 2026-04-04  
> **Status:** pronto para produção  
> **Fase:** homologação ✅ → produção ⏳

---

## 1. ESTADO ATUAL (2026-04-04)

### Build & Deploy
- ✅ **Monorepo**: 3 apps (api, crm, landing) + 3 packages
- ✅ **API**: Express buildando verde
- ✅ **CRM**: Next.js 14 buildando verde
- ✅ **Landing**: Next.js 14 buildando verde
- ✅ **CI/CD**: GitHub Actions (lint, testes, deploy-homolog, deploy-prod)
- ✅ **Staging**: Vercel + Render funcionando em homolog
- ✅ **Produção**: aguardando primeira confirmação de deploy

### Segurança
- ✅ **Auth**: NextAuth + Supabase Auth (JWT em cookie HTTP-only)
- ✅ **2FA**: Email OTP (6 dígitos, 5min), obrigatório para admin
- ✅ **RLS**: Postgres com row-level security
- ✅ **Rate limit**: Redis com IP-based (5 login/min, 10 leads/min)
- ✅ **LGPD**: Consentimento obrigatório, export, soft-delete
- ✅ **Headers**: CSP, HSTS, X-Frame-Options, SameSite cookies
- ✅ **Logs**: Estruturados JSON, auditoria em security_events

### Módulos Funcionais
| Módulo | Status | Teste | Observação |
|---|---|---|---|
| **Leads** | ✅ completo | validado homolog | captura, CRM, export LGPD |
| **Agenda** | ✅ completo | validado homolog | agendamentos, Google sync |
| **Financeiro** | ✅ completo | validado homolog | gráficos, consolidação |
| **CMS** | ✅ completo | validado homolog | conteúdo público, versioning |
| **Colaboradores** | ✅ completo | validado homolog | perfis, 2FA, permissões |
| **Dashboard** | ✅ completo | validado homolog | métricas consolidadas |
| **Segurança** | ✅ completo | validado homolog | event log, checklist, IP block |

### Integrações
| Integração | Status | Observação |
|---|---|---|
| **Google Calendar** | ✅ implementado | OAuth pronto, teste em homolog |
| **Google Business Profile** | ✅ implementado | OAuth pronto, sem localizações vinculadas em homolog |
| **WhatsApp Business** | ✅ implementado | API setup, pode disparar |
| **SMTP** | ✅ implementado | Email 2FA, notificações |
| **S3** | ✅ implementado | Uploads (fallback: local) |
| **Redis** | ✅ implementado | Cache, sessions, rate limit (Upstash) |
| **PostgreSQL** | ✅ implementado | RLS, backup 7d (Supabase) |

### Infraestrutura (2026-04-04)
```
Frontend:
- CRM: Vercel (crm-hml.vercel.app)
- Landing: Vercel (landing-hml.vercel.app)

Backend:
- API: Render (api-hml-sbk3.onrender.com)

Data:
- Postgres: Supabase (staging)
- Redis: Upstash (staging)

DNS/WAF:
- Cloudflare (não configurado)
```

### Validação Remota (2026-03-20)
```
✅ GET /health/live → 200
✅ GET /health/ready → 200
✅ GET /health/deps → banco: true, redis: true, email: true
✅ Login admin em homolog → 200
✅ GET /api/v1/admin/overview → operacional
✅ Fluxo lead: criar → ler → exportar LGPD → deletar
✅ Fluxo agendamento: criar → sincronizar Google → cancelar
✅ Fluxo financeiro: lançamento → gráfico → consolidação
```

---

## 2. MÓDULOS DE NEGÓCIO

### Leads
- **Status**: ✅ MVP completo
- **Código**: `apps/api/src/routes/leads.ts`
- **DB**: tabela `leads`, `consent_logs`
- **Funcionalidade**:
  - POST `/api/v1/leads` → captura pública com consentimento obrigatório
  - GET `/api/v1/leads` → lista no CRM (com filtros, busca)
  - PATCH `/api/v1/leads/:id` → atualizar categoria/contato
  - DELETE `/api/v1/leads/:id` → soft-delete (LGPD)
  - GET `/api/v1/privacy/export?email=` → ZIP com dados pessoais
- **Teste**: validado em homolog (criar, ler, exportar, deletar)
- **Pendência**: nenhuma (MVP completo)

### Agenda
- **Status**: ✅ MVP completo
- **Código**: `apps/api/src/routes/appointments.ts`
- **DB**: tabela `appointments`, vinculação com Google via `google_event_id`
- **Funcionalidade**:
  - POST `/api/v1/appointments` → criar agendamento local
  - GET `/api/v1/appointments/available` → slots públicos
  - GET `/api/v1/appointments` → lista no CRM
  - PATCH `/api/v1/appointments/:id` → atualizar
  - DELETE `/api/v1/appointments/:id` → cancelar (sync Google se conectado)
  - GET `/api/v1/auth/google` → OAuth flow
- **Integração Google**: OAuth implementado, token em Redis com refresh
- **Teste**: validado em homolog
- **Pendência**: Google Business Account ainda não configurado em produção

### Financeiro
- **Status**: ✅ MVP completo
- **Código**: `apps/api/src/routes/financials.ts`
- **DB**: tabela `financials`
- **Funcionalidade**:
  - POST `/api/v1/financials` → criar lançamento (receita/despesa)
  - GET `/api/v1/financials` → lista
  - GET `/api/v1/financials/summary` → consolidação mensal
  - GET `/api/v1/financials/charts` → gráficos (rosca geral, receita, despesa)
  - DELETE `/api/v1/financials/:id` → soft-delete
- **Imutabilidade**: financeiros nunca são atualizados, apenas soft-deleted
- **Teste**: validado em homolog
- **Pendência**: nenhuma

### CMS / Conteúdo
- **Status**: ✅ MVP completo
- **Código**: `apps/api/src/routes/content.ts`
- **DB**: tabelas `contents`, `content_versions`
- **Funcionalidade**:
  - PATCH `/api/v1/content/sections` → editar hero, seções, CTA
  - GET `/api/v1/content/site-summary` → publicar landing
  - GET `/api/v1/content/site-summary` → exibição de reviews Google (quando integrado)
- **Versionamento**: cada edição cria versão nova, rollback possível
- **Teste**: validado em homolog
- **Pendência**: nenhuma

### Colaboradores
- **Status**: ✅ MVP completo
- **Código**: `apps/api/src/routes/users.ts`
- **DB**: tabela `users` com campos 2FA (`two_factor_enabled`, `two_factor_channel`)
- **Funcionalidade**:
  - POST `/api/v1/admin/users` → criar colaborador
  - GET `/api/v1/admin/users` → lista (ativos e inativos)
  - PATCH `/api/v1/admin/users/:id` → atualizar perfil, módulos, 2FA
  - DELETE `/api/v1/admin/users/:id` → soft-delete (inativar)
- **Perfis**: ADMIN, COLLABORATOR, VIEWER
- **Permissões**: por módulo (leads, agenda, financeiro, etc)
- **2FA**: email OTP (SMS via Twilio opcional, não ativado)
- **Teste**: validado em homolog
- **Pendência**: migration das colunas de 2FA precisa ser aplicada no Postgres de produção

### Dashboard
- **Status**: ✅ MVP completo
- **Código**: `apps/api/src/domain/metrics/service.ts`
- **Funcionalidade**:
  - GET `/api/v1/metrics/overview` → cards: leads novos, agendamentos próximos, financeiro mês
- **Consolidação**: em tempo real (queries no GET)
- **Teste**: validado em homolog
- **Pendência**: nenhuma

### Segurança / Auditoria
- **Status**: ✅ MVP completo
- **Código**: `apps/api/src/routes/security.ts`
- **DB**: tabelas `security_events`, `audit_logs`
- **Funcionalidade**:
  - GET `/api/v1/security/events` → event log (login, erro, integração, alteração)
  - GET `/api/v1/security/stats` → estatísticas (login/mês, erro rate, etc)
  - GET `/api/v1/security/activity` → atividade por usuário
  - GET `/api/v1/security/checklist` → checklist de segurança (auth, 2FA, logs, backup)
  - POST `/api/v1/security/block-ip` → bloquear IP (rate limit)
- **Teste**: validado em homolog
- **Pendência**: nenhuma

---

## 3. INFRAESTRUTURA

### Staging (Homolog)
```
Frontend:
  Landing: https://landing-hml.vercel.app
  CRM: https://crm-hml.vercel.app

Backend:
  API: https://api-hml-sbk3.onrender.com
  Health: GET /health/live, /health/ready, /health/deps

Database:
  Supabase Staging Project
  Postgres managed, backup 7d

Cache:
  Upstash Redis Staging
  Serverless, pub/sub

DNS/WAF:
  Cloudflare (não configurado, usar Vercel DNS)
```

### Produção (Pronto para deploy)
```
Frontend:
  Landing: vercel (projeto criado, pronto)
  CRM: vercel (projeto criado, pronto)

Backend:
  API: render (projeto criado, pronto)

Database:
  Supabase Production Project (criado)
  Postgres managed, backup 7d

Cache:
  Upstash Redis Production (criado)

DNS/WAF:
  Cloudflare (setup manual)
```

**Status**: Infraestrutura criada, aguardando primeira migração de banco de dados e configuração de secrets.

---

## 4. PENDÊNCIAS E DÍVIDA TÉCNICA

### Bloqueantes para produção
- ⏳ **Primeiro deploy em produção**: aplicar migrations (2FA, consentimento)
- ⏳ **Configurar secrets**: GitHub Secrets para prod (DATABASE_URL, REDIS_URL, etc)
- ⏳ **Cloudflare**: apontar DNS para Vercel/Render (ou usar DNS automático)
- ⏳ **Google OAuth em prod**: configurar credenciais Google para domínio produção

### Não bloqueantes (P2/P3)
- **Testes E2E**: Playwright cobrindo fluxos principais (lead → financeiro)
- **SEO na landing**: meta tags dinâmicas, sitemap, robots.txt
- **Observabilidade**: Datadog/Sentry para RUM e error tracking
- **Backup offline**: S3 copy de backups Supabase (não apenas Supabase)
- **Integração Google Business**: setup completo (localidades vinculadas, reviews)
- **Integração WhatsApp**: setup completo (Business Account, webhook)
- **SMS 2FA**: Twilio ativado (atualmente apenas email)

---

## 5. RISCOS OPERACIONAIS

| Risco | Probabilidade | Impacto | Status |
|---|---|---|---|
| Google OAuth indisponível | baixa | médio | fallback: agendamento local |
| Banco offline 1 hora | muito baixa | crítico | backup automático, RTO 1h |
| Redis timeout | muito baixa | médio | fallback: in-memory, performance degradada |
| Perda de leads (consentimento não registrado) | muito baixa | alto | validação server-side obrigatória |
| Escalada de privilégio | muito baixa | crítico | RLS + JWT + backend validation |
| Email não entregue (2FA) | baixa | alto | resend automático, SMS backup |

**Plano de mitigação**: monitored, alertas configurados, runbooks em operação

---

## 6. MÉTRICAS OBSERVADAS (Homolog)

### Disponibilidade
- API: 100% (desde 2026-03-20)
- Banco: 100%
- Cache: 100%
- Email: 100%

### Performance (P95)
- Dashboard load: ~1.2s
- Leads list: ~600ms
- Financeiro charts: ~800ms
- Login: ~1s

### Volume
- Leads testados: 10+ (criação, leitura, export, deleção)
- Agendamentos testados: 5+
- Financeiros testados: 20+
- Usuários: 1 admin + 2 collaborators

---

## 7. PRÓXIMAS AÇÕES

### Imediato (produção)
- [ ] Validar secreis GitHub para produção
- [ ] Deploy inicial em produção (staging branch → main)
- [ ] Verificar health checks em produção
- [ ] Configurar Cloudflare DNS (ou usar automático Vercel)
- [ ] Confirmar Google OAuth em domínio produção

### Curto prazo (semana 1)
- [ ] Teste de fluxo completo em produção (lead → CRM → financeiro)
- [ ] Validar 2FA em produção
- [ ] Conferir logs em produção
- [ ] Treinar usuário (Viviani) no CRM

### Médio prazo (semana 2-4)
- [ ] Testes E2E com Playwright
- [ ] Observabilidade (Datadog ou equivalente)
- [ ] Integração Google Business (completa)
- [ ] Integração WhatsApp (completa)

### Longo prazo (mês 2+)
- [ ] SMS 2FA via Twilio
- [ ] Relatórios avançados
- [ ] Pipeline de vendas customizável
- [ ] BI (Metabase ou equivalente)

---

## 8. CHANGELOG

| Data | Versão | Alteração |
|---|---|---|
| 2026-03-20 | 1.0 | Estado pós auditoria (homolog validado) |
| 2026-04-04 | 2.0 | Pronto para produção, documentação completa |
