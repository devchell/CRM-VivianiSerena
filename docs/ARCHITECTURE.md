# ARCHITECTURE — VivianiCRM

> **Versão:** 2.0  
> **Data:** 2026-04-04  
> **Categoria:** CRM  
> **PRD:** /docs/PRD.md  
> **Status:** aprovado

---

## 1. VISÃO GERAL

**VivianiCRM** é um sistema de gestão de relacionamento com clientes (CRM) implementado como **monorepo modular em TypeScript**, com frontend distribuído em Vercel (Next.js) e backend em Render (Express + Prisma).

A arquitetura separa **camadas de apresentação** (CRM autenticado + Landing pública) de **camada de negócio** (API Express), permitindo **independência de deploy** e **escalabilidade diferenciada**. Dados são persistidos em **Supabase (PostgreSQL)** com **cache em Redis (Upstash)**, integrando **Google Calendar**, **Google Business Profile** e **WhatsApp Business** de forma opcional.

---

## 2. DECISÃO ARQUITETURAL

### Tipo
**Frontend + Backend separado + Monorepo com pacotes compartilhados**

Estrutura:
```
monorepo/
├── apps/
│   ├── api/       (Express + Prisma + Redis)
│   ├── crm/       (Next.js 14 + NextAuth)
│   └── landing/   (Next.js 14 estática)
├── packages/
│   ├── types/     (tipos, perfs, permissões)
│   ├── utils/     (funções compartilhadas)
│   └── ui/        (componentes Shadcn)
└── docs/          (auditoria, operação, arquitetura)
```

### Justificativa

✅ **Vantagens da separação frontend/backend:**
- Escalabilidade independente (CRM pode escalar diferente da API)
- Deploy desacoplado (mudanças no frontend não afetam API)
- Cache no CDN (Vercel) melhora latência do CRM
- API reutilizável para futuras integrações
- Segurança: backend longe do browser (senhas, tokens, lógica confidencial)

✅ **Vantagens do monorepo:**
- Tipos compartilhados (evita divergência)
- Componentes reutilizáveis (landing + CRM usam mesmos UI)
- Deploy orquestrado (CI/CD único)
- Refatoração atomizada (arquivo afeta ambos em uma PR)

✅ **Vantagens do stack escolhido:**
- Next.js: SSR, otimização automática, routing integrado
- Express: simples, fluxo de controle claro, middleware robusto
- Prisma: ORM type-safe, migrações versionadas
- Redis: cache, sessions, rate limiting ultra-rápido
- Supabase: PostgreSQL gerenciado, RLS integrada, backups automáticos

### Alternativas rejeitadas

| Alternativa | Motivo |
|---|---|
| **Monolito único (Django/Rails)** | Acoplamento forte; deploy tudo-ou-nada; difícil de escalar partes específicas |
| **Microservices distribuído** | Overhead operacional muito alto para volume inicial; complexidade sem benefício |
| **Vercel Functions para tudo** | Não suporta WebSockets; limite de timeout curto; estado em Redis externo; vendor lock-in |
| **SPA + API REST genérica** | Não aproveita SSR do Next.js; SEO prejudicado na landing; latência maior |
| **Supabase Realtime sem backend** | Impossível esconder lógica; RLS exposto ao client; sem processamento assíncrono |

---

## 3. STACK E TECNOLOGIAS

| Camada | Tecnologia | Versão | Motivo |
|---|---|---|---|
| **Frontend (CRM)** | Next.js + TypeScript | 14.x | SSR, SSG, API routes, otimizado para produção |
| **Frontend (Landing)** | Next.js + TypeScript | 14.x | mesma stack, conteúdo gerenciado por CMS (API) |
| **UI Components** | Shadcn/ui + Tailwind | latest | componentes acessíveis, estilo consistente |
| **Backend** | Express + TypeScript | 4.x | simples, middleware-based, web sockets com Socket.IO |
| **ORM** | Prisma | 5.x | type-safe, migrations versionadas, relacionamentos claros |
| **Banco** | PostgreSQL (Supabase) | 15.x | ACID, RLS integrada, PostGIS opcional, backups nativos |
| **Cache** | Redis (Upstash) | 7.x | sessões, rate limit, token refresh, fila leve |
| **Auth** | NextAuth (v5) | 5.x | integrado com Supabase Auth, OAuth Google, 2FA |
| **Arquivo** | S3 (local default) | N/A | uploads com fallback local, CDN-friendly |
| **Email** | SMTP (SendGrid/nativo) | N/A | 2FA, notificações, reset de senha |
| **WebSocket** | Socket.IO | 4.x | notificações em tempo real, futuro: colaboração |
| **Frontend Deploy** | Vercel | N/A | build otimizado, preview branches, rollback 1-click |
| **Backend Deploy** | Render | N/A | container, environment vars, auto-deploy via webhook |
| **Observabilidade** | Logs estruturados (Render) | N/A | stdout capturado, buscável no painel |
| **DNS/WAF** | Cloudflare | N/A | otimização, DDoS, DNSSEC, cache |
| **Secrets** | GitHub Secrets + env vars | N/A | segregação dev/staging/prod, nenhum secret em git |

### Regra de stack
- **Nenhuma dependência local** (WSL, Docker local, banco local)
- **Todos os serviços são gerenciados** (Vercel, Supabase, Upstash, Render)
- **Deploy é web-first** (dashboard, webhook, API)
- **Fallbacks implementados** para integrações opcionais (Google Calendar, WhatsApp)

---

## 4. ESTRUTURA DO PROJETO

```
viviani-crm/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # lint, testes, build
│       ├── deploy-homolog.yml        # staging → homolog
│       └── deploy-prod.yml           # main → produção
├── .vercel/                          # config Vercel (não commitar)
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── routes/               # Express routers
│   │   │   ├── domain/               # lógica de negócio (services)
│   │   │   ├── infrastructure/       # integrações (Google, WhatsApp, email)
│   │   │   ├── middleware/           # auth, rate limit, logging
│   │   │   ├── database/             # Prisma client, seed
│   │   │   └── main.ts               # entry point
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # tabelas, relacionamentos
│   │   │   └── migrations/           # histórico de schema
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── crm/
│   │   ├── src/
│   │   │   ├── app/                  # App Router (Next.js 14)
│   │   │   │   ├── (dashboard)/      # rotas autenticadas
│   │   │   │   ├── (auth)/           # login, register, 2FA
│   │   │   │   └── layout.tsx
│   │   │   ├── components/           # componentes reutilizáveis
│   │   │   ├── hooks/                # React hooks customizados
│   │   │   ├── utils/                # funções utilitárias
│   │   │   └── lib/                  # configurações (API client, auth)
│   │   ├── public/
│   │   ├── package.json
│   │   └── next.config.js
│   └── landing/
│       └── (similar ao CRM, mas público)
├── packages/
│   ├── types/                        # types, enums, interfaces
│   ├── utils/                        # formatters, helpers
│   └── ui/                           # Shadcn components
├── docs/                             # documentação (arquitetura, operação, auditoria)
├── infra/                            # referência: Docker, Nginx, K8s (legado)
├── package.json                      # monorepo (pnpm workspaces)
├── pnpm-workspace.yaml               # definição de workspaces
└── tsconfig.json                     # configuração TS global
```

### Organização interna

**API (domain-driven):**
- `routes/`: mapeamento HTTP ↔ controllers (Express)
- `domain/`: serviços de negócio (leads, agenda, financeiro, etc)
- `infrastructure/`: integrações externas (Google, WhatsApp, email, S3)
- `middleware/`: auth (JWT), rate limit, logging, error handler
- `database/`: Prisma Client, migrations, seeders

**CRM (modular por page):**
- `app/(dashboard)/`: rotas autenticadas (leads, agenda, financeiro, etc)
- `app/(auth)/`: login, register, 2FA, reset
- `components/`: UI reutilizável (formulários, cards, gráficos)
- `hooks/`: lógica reutilizável (useAuth, useDashboard, etc)

**Tipo seguro:**
- Tipos compartilhados em `packages/types/`
- Evita `any`; tudo é tipado
- Diferenciação de acesso por `UserRole` e `ModulePermission`

---

## 5. MODELAGEM DE DADOS

### Entidades principais

| Entidade | Finalidade | Sensível | RLS | Observações |
|---|---|---|---|---|
| **users** | autenticação, perfil, permissões | ⭐⭐⭐ | sim | hash de senha, 2FA storage |
| **leads** | captura comercial | ⭐⭐ | sim | email, telefone, categoria, consentimento |
| **appointments** | agenda de compromissos | ⭐ | sim | vinculação opcional com Google event |
| **financials** | lançamentos (receita/despesa) | ⭐⭐⭐ | sim | auditado, imutável post-criação (apenas soft-delete) |
| **contents** | páginas públicas (CMS) | ⭐ | não | hero, seções, CTA, versionado |
| **content_versions** | histórico de versões | ⭐ | não | backup de edições anteriores |
| **consent_logs** | trilha LGPD de leads | ⭐⭐⭐ | sim | IP anonimizado, timestamp, channel |
| **security_events** | log de eventos sensíveis | ⭐⭐ | sim | login, logout, erro, alteração, block IP |
| **audit_logs** | trilha operacional | ⭐ | sim | export LGPD, delete, permission change |
| **sessions** | sessões ativas | ⭐ | sim | token, user_id, expires_at |
| **analytics_events** | web vitals, page views | ⭐ | não | google tag manager, custom events |

### Relações

- `users` 1-N `appointments`
- `users` 1-N `security_events`
- `users` 1-N `audit_logs`
- `leads` 1-N `consent_logs`
- `appointments` 0-1 `google_event` (vinculação via google_event_id)
- `contents` 1-N `content_versions`

### Estratégia

**Single-tenant** (um cliente = uma instância de banco de dados)

Segurança via **RLS (Row Level Security)** em Postgres:
```sql
-- Exemplo: user vê apenas seus próprios leads
CREATE POLICY leads_user_own ON leads
  USING (user_id = auth.uid());
```

**Segregação por ambiente:**
- `dev`: Supabase dev project
- `staging`: Supabase staging project
- `prod`: Supabase production project

---

## 6. APIs E CONTRATOS

### Tipos

- **REST** (GET, POST, PATCH, DELETE) → para CRUD e ações síncronas
- **Webhooks** (POST) → para eventos assíncronos (Google Calendar, WhatsApp incoming)
- **WebSocket** (Socket.IO) → para notificações em tempo real (future)
- **Jobs internos** (Bull queue em Redis) → processamento assíncrono

### Endpoints principais

| Método | Rota | Auth | Objetivo |
|---|---|---|---|
| **POST** | `/api/v1/leads` | nenhuma | captura pública de lead |
| **GET** | `/api/v1/leads` | admin, collaborator | lista de leads no CRM |
| **PATCH** | `/api/v1/leads/:id` | admin, collaborator | atualizar lead |
| **DELETE** | `/api/v1/leads/:id` | admin | soft-delete LGPD |
| **POST** | `/api/v1/appointments` | admin, collaborator | agendar |
| **GET** | `/api/v1/appointments` | admin, collaborator | lista de agendamentos |
| **PATCH** | `/api/v1/appointments/:id` | admin, collaborator | atualizar agendamento |
| **DELETE** | `/api/v1/appointments/:id` | admin, collaborator | cancelar (Google sync) |
| **GET** | `/api/v1/appointments/available` | nenhuma (landing) | slots disponíveis |
| **POST** | `/api/v1/financials` | admin, collaborator | registrar lançamento |
| **GET** | `/api/v1/financials` | admin, collaborator | lista |
| **GET** | `/api/v1/financials/summary` | admin, collaborator | consolidação mensal |
| **GET** | `/api/v1/financials/charts` | admin, collaborator | gráficos |
| **POST** | `/api/v1/auth/login` | nenhuma | login com email/senha |
| **POST** | `/api/v1/auth/2fa-verify` | nenhuma (parcial) | verificar código 2FA |
| **GET** | `/api/v1/auth/google` | nenhuma | OAuth Google (redirect) |
| **GET** | `/api/v1/auth/google/callback` | nenhuma | callback OAuth Google |
| **POST** | `/api/v1/privacy/export` | autenticado | export LGPD em ZIP |
| **POST** | `/api/v1/admin/google-business/locations` | admin | buscar localidades |
| **POST** | `/api/v1/admin/google-business/reviews` | admin | buscar reviews |
| **GET** | `/api/v1/admin/overview` | admin | status de saúde (health) |
| **GET** | `/api/v1/health/live` | nenhuma | liveness probe |
| **GET** | `/api/v1/health/ready` | nenhuma | readiness probe |
| **GET** | `/api/v1/health/deps` | nenhuma | dependency health (banco, redis, email) |

### Regras

- ✅ Validação server-side obrigatória (zod/joi)
- ✅ Respostas consistentes (success, error, metadata)
- ✅ Erros padronizados (400, 401, 403, 404, 409, 500)
- ✅ Idempotência em POST (retry com request-id)
- ✅ Rate limit em endpoints críticos (login: 5/min, leads: 10/min)
- ✅ Paginação em listas (limit, offset)
- ✅ Timestamps em UTC

---

## 7. AUTENTICAÇÃO E AUTORIZAÇÃO

### Estratégia

**NextAuth.js v5** + **Supabase Auth**

Fluxo:
1. **Login**: email + senha (ou OAuth Google)
2. **Sessão**: JWT em cookie HTTP-only, token em Redis
3. **Renovação**: refresh token automático
4. **2FA**: código enviado por email/SMS após login inicial
5. **Logout**: invalida token em Redis, limpa cookie

```typescript
// Exemplo: estrutura de user no JWT
{
  sub: "user-uuid",      // user ID
  email: "user@...",
  role: "ADMIN",         // ADMIN | COLLABORATOR | VIEWER
  modules: ["leads", "agenda", "financeiro"],  // permissões por módulo
  iat: timestamp,
  exp: timestamp + 24h
}
```

### Papéis e Permissões

| Papel | Leads | Agenda | Financeiro | CMS | Colaboradores | Segurança | Dashboard |
|---|---|---|---|---|---|---|---|
| **ADMIN** | RW* | RW* | RW* | RW | RW | RW | R |
| **COLLABORATOR** | RW* | RW* | RW* | - | - | - | R |
| **VIEWER** | R | R | R | - | - | - | R |

*RW = read + write; R = read only; - = sem acesso; * = sujeito a permissão de módulo (admin pode desativar)

**Regras críticas:**
- Autenticação: NextAuth verifica JWT + session em Redis
- Autorização: backend valida `role` + `modules` antes de qualquer ação
- **Menor privilégio**: padrão é `COLLABORATOR` com módulos desativados
- **Admin exigido**: editar site, bloquear IP, resetar 2FA, deletar usuário
- **Backend é autoridade**: client nunca confia em cookie ou localStorage

---

## 8. INFRAESTRUTURA

### Arquitetura de deploy

```
┌─────────────────────────────────────────────────────────┐
│                   Cloudflare (WAF, CDN, DNS)            │
└─────────────────────────────────────────────────────────┘
                 ↓                              ↓
┌──────────────────────────────┐  ┌──────────────────────┐
│  Vercel (Next.js)            │  │  Render (Express)    │
│  - CRM: crm-hml, crm-prod    │  │  - API: api-hml,     │
│  - Landing: landing-hml, -prod  │    api-prod          │
└──────────────────────────────┘  └──────────────────────┘
         ↓                                    ↓
    GitHub (CI)  ←──────────────────→ GitHub (CI)
         ↓ (push to main/staging)            ↓
    Webhook Vercel                   Webhook Render
```

### Serviços

| Componente | Serviço | Detalhes |
|---|---|---|
| **Frontend (CRM)** | Vercel | Next.js 14, auto-scaling, preview branches |
| **Frontend (Landing)** | Vercel | Next.js 14, conteúdo via API |
| **Backend (API)** | Render | Express, Node.js, auto-restart, backup Postgres |
| **Banco** | Supabase (PostgreSQL) | managed Postgres, RLS, PostGIS, backups 7d |
| **Cache** | Upstash (Redis) | serverless Redis, TTL, pub/sub |
| **Auth** | Supabase Auth | JWT, MFA, OAuth |
| **Storage** | S3 (opcional) | uploads de conteúdo, CDN-friendly |
| **DNS/WAF** | Cloudflare | proteção DDoS, otimização, DNSSEC |
| **Email** | SendGrid/SMTP | transacional, 2FA, notificações |
| **CI/CD** | GitHub Actions | lint, testes, build, deploy automático |

### Ambientes

| Ambiente | Vercel | Render | Supabase | Upstash | URL |
|---|---|---|---|---|---|
| **dev** | N/A (local) | N/A (local) | dev | dev | `localhost:3000` |
| **staging** | crm-hml | api-hml | staging | staging | `crm-hml.vercel.app` |
| **prod** | crm-prod | api-prod | prod | prod | `crm.viviani.com` |

**Regras:**
- Deploy sempre primeiro em staging
- Produção só com aprovação (PR review + merge)
- Rollback: revert commit + push (GitHub) ou click no painel (Vercel/Render)
- Secrets: segregados por ambiente (não compartilhar entre prod e staging)

---

## 9. OBSERVABILIDADE

### Logs

**Estrutura:**
```json
{
  "timestamp": "2026-04-04T10:30:00Z",
  "level": "info|warn|error",
  "service": "api|crm",
  "event": "login|error|integration_fail|lead_created",
  "user_id": "uuid",
  "request_id": "uuid",
  "message": "user logged in",
  "metadata": {
    "ip_hash": "abc123",
    "user_agent": "Chrome/...",
    "duration_ms": 145
  }
}
```

**Eventos críticos registrados:**
- ✅ Login bem-sucedido / falho
- ✅ Logout
- ✅ 2FA enviado / verificado
- ✅ Alteração de permissão
- ✅ Export LGPD
- ✅ Delete LGPD
- ✅ Lead criado (com IP anonimizado)
- ✅ Google integração conecta/desconecta
- ✅ WhatsApp integração erro
- ✅ Erro na API (500, timeout, dependência falha)
- ✅ Rate limit acionado (blocked)

### Alertas

| Alerta | Condição | Ação |
|---|---|---|
| API unavailable | `/health/ready` retorna 503 | notificar DevOps |
| Banco offline | Postgres retorna erro | notificar DevOps |
| Redis timeout | rate limit falha | notificar DevOps |
| High error rate | >5% de 5xx em 5min | notificar DevOps |
| Login brute force | >10 tentativas falhas do mesmo IP | bloquear IP automaticamente |

### Métricas

- Latência P50, P95, P99 dos endpoints críticos
- Taxa de erro (5xx) por endpoint
- Taxa de login/logout por hora
- Taxa de lead criado por hora
- Uptime de integrações (Google, WhatsApp, email)
- Tempo de resposta do banco (query latency)

---

## 10. ESCALABILIDADE

### Limites esperados

- **Volume de leads**: 10.000/ano → 1.000/mês → ~30/dia
- **Agendamentos**: 500/mês → ~16/dia
- **Usuários**: 5-10 colaboradores
- **Concorrência esperada**: <100 req/s

### Gargalos e plano de evolução

| Fase | Volume | Ação |
|---|---|---|
| **Atual** | <30 leads/dia | monorepo, serverless, Redis simples |
| **Year 1** | 100+ leads/dia | escalar Render (mais workers), Redis cluster |
| **Year 2** | 1000+ leads/dia | multi-region, CDN mais agressivo, rate limit refinado |
| **Year 3+** | 10k+ leads/dia | arquitetura distribuída, message queue (Bull), cache local |

---

## 11. DECISÕES RELACIONADAS

- **Monorepo vs Polyrepo**: monorepo (compartilhamento de tipos, deploy atomizado)
- **JWT vs Cookies**: JWT em cookie HTTP-only (segurança + CSRF protection)
- **Prisma vs Query Builder**: Prisma (type-safe, migrations versionadas)
- **Shadcn vs Material**: Shadcn (customizável, sem overhead de tema)
- **Render vs Heroku**: Render (melhor custo, auto-scaling)
- **Vercel vs Netlify**: Vercel (otimização Next.js, melhor DX)

Detalhes em: `/docs/DECISIONS.md`

---

## 12. CHANGELOG

| Data | Versão | Alteração |
|---|---|---|
| 2026-03-20 | 1.0 | Criação inicial (auditoria de arquitetura) |
| 2026-04-04 | 2.0 | Atualização pós cloud-native (Vercel + Render + Supabase + Upstash) |
