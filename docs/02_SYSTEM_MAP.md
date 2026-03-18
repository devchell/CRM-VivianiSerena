# 02 System Map

## Visao geral

```text
Landing (Next.js)
  -> consome conteudo publico da API
  -> tenta capturar leads
  -> envia analytics/vitals

CRM (Next.js + NextAuth)
  -> autentica via API
  -> consome API REST autenticada
  -> conecta em Socket.IO da API

API (Express + Prisma + Redis + Socket.IO + cron)
  -> persiste em PostgreSQL
  -> usa Redis para cache e tokens
  -> integra SMTP, Google Calendar e Twilio
  -> grava uploads em filesystem local

Infra local (Docker Compose + Nginx)
  -> orquestra servicos locais
  -> faz proxy para landing, CRM, API e socket
```

## Estrutura do repositorio
- `apps/landing`: site publico
- `apps/crm`: interface interna do CRM
- `apps/api`: API, jobs e realtime
- `packages/types`: tipos compartilhados
- `packages/utils`: utilitarios compartilhados
- `packages/ui`: componentes compartilhados
- `infra/docker`: Dockerfiles por app
- `infra/nginx`: proxy reverso
- `infra/scripts`: removido na fase final por ser legado de automacao local/VPS, sem uso na arquitetura alvo Vercel + Render

## Front-end: landing
- Stack: Next.js 14 App Router
- Entrada principal: `apps/landing/src/app/page.tsx`
- Conteudo publico: `GET /api/v1/content`
- Captura principal: `apps/landing/src/components/LeadFormSection.tsx`
- Analytics client-side: `apps/landing/src/lib/analytics.ts`
- Middleware edge: `apps/landing/src/middleware.ts`
- Rotas locais observadas:
  - `POST /api/revalidate`
  - `POST /api/vitals`

### Observacoes
- A landing depende da API para conteudo dinamico.
- O fluxo de lead esta duplicado entre formulario principal e `trackLead()`.
- O middleware de rate limit da landing e em memoria e nao compartilha estado entre instancias.

## Front-end: CRM
- Stack: Next.js 14 App Router
- Sessao: NextAuth v5 beta
- Bridge de auth: `apps/crm/src/auth.ts`
- Layout autenticado: `apps/crm/src/app/(dashboard)/layout.tsx`
- Modulos principais:
  - `dashboard`
  - `leads`
  - `agenda`
  - `financeiro`
  - `analytics`
  - `seguranca`
  - `editar-site`
  - `colaboradores`
  - `configuracoes`

### Observacoes
- O CRM consome a API com bearer token e camada propria de sessao web.
- Parte da UI consome contratos reais; parte usa contratos quebrados; parte usa mock ou sample data.
- Existem duas telas de edicao de site:
  - `apps/crm/src/app/(dashboard)/editar-site/page.tsx`
  - `apps/crm/src/app/(dashboard)/site/page.tsx`

## Back-end: API
- Entrada HTTP: `apps/api/src/server.ts`
- Composicao do app: `apps/api/src/app.ts`
- Rotas em `/api/v1`:
  - `/auth`
  - `/users`
  - `/leads`
  - `/appointments`
  - `/financials`
  - `/content`
  - `/dashboard`
  - `/analytics`
  - `/security`
  - `/privacy`
- Realtime:
  - Socket.IO autenticado por JWT
  - sala `dashboard`
- Jobs no mesmo processo:
  - limpeza de sessoes
  - relatorio financeiro semanal
  - health check interno

## Banco e entidades

### Entidades observadas
- `User`
- `Lead`
- `Session`
- `Appointment`
- `Financial`
- `Content`
- `AuditLog`
- `SecurityEvent`
- `ConsentLog`

### Relacoes relevantes
- `Lead` 1:N `Session`
- `Lead` 1:N `Appointment`
- `User` 1:N `Content`
- `User` 1:N `AuditLog`

### Observacao de modelagem
- O desenho atual mistura dominio comercial e analytics porque `Session` pode levar a `Lead` sintetico.
- Para a arquitetura alvo, a separacao recomendada e:
  - comercial: `Lead`, historico de status, `Appointment`
  - financeiro: `FinancialTransaction` ou evolucao de `Financial`
  - analytics: `Session`, `PageView`, `Event`, `UTMAttribution`
  - seguranca: `AuthAuditLog`, `SecurityEvent`, `UserSession`

## Integracoes externas
- SMTP/Nodemailer para OTP, convites e relatorios
- Twilio opcional para SMS
- Google Calendar OAuth para disponibilidade e criacao de eventos
- Redis para cache, refresh tokens, 2FA temporario e tokens Google
- Nginx para proxy local/VPS

## Autenticacao e autorizacao

### Autenticacao
- API emite JWT assimetrico
- Access token com expiracao curta
- Refresh token com Redis
- NextAuth no CRM atua como camada de sessao do front
- 2FA implementado com OTP por e-mail e SMS

### Autorizacao
- Middleware `authorize(...roles)` existe
- `allowedModules` e usado na UI
- Enforcement real no backend e incompleto
- `apps/api/src/routes/users.ts` e o caso mais critico

## Uploads e arquivos
- Uploads de imagens via API
- Processamento com `sharp`
- Persistencia local em `./uploads`
- Exposicao via `GET /uploads/*`

### Implicacao arquitetural
- Esse desenho nao e adequado para multiplas replicas, containers efemeros ou rollback limpo.

## Jobs, cron e websocket
- Jobs vivem no mesmo processo da API
- Socket.IO vive no mesmo processo da API
- Nao ha separacao entre API web, worker e scheduler
- Isso inviabiliza tratar a API atual como puro serverless

## Dependencias importantes
- Backend:
  - `express`
  - `@prisma/client`
  - `ioredis`
  - `socket.io`
  - `node-cron`
  - `multer`
  - `sharp`
  - `googleapis`
  - `nodemailer`
- CRM:
  - `next-auth`
  - `recharts`
  - `@fullcalendar/*`
  - `socket.io-client`
  - `jspdf`
  - `@tiptap/*`
- Landing:
  - `framer-motion`
  - `react-hook-form`
  - `zod`
  - `react-compare-slider`

## Como tudo conversa entre si
- Landing SSR -> API `/content`
- Landing client -> API `/leads` e `/analytics/*`
- CRM auth -> API `/auth/*`
- CRM operacoes -> API `/leads`, `/financials`, `/appointments`, `/content`, `/security`, `/users`
- API -> PostgreSQL
- API -> Redis
- API -> SMTP / Google / Twilio
- CRM -> Socket.IO da API

## Pontos frageis do mapa atual
- Contratos nao sao compartilhados de fato entre CRM e API
- Modulos criticos dependem de endpoints inexistentes ou payloads incompatíveis
- Uploads, jobs e websocket estao concentrados no mesmo processo
- Rate limit, auth e seguranca estao divididos entre camadas sem autoridade unica
- Superficies metricas leem universos diferentes de dados
