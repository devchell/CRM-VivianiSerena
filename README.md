# VivianiCRM

CRM de gestão de leads, agenda, financeiro, conteúdo público e operação de atendimento da Viviani Serena.

## Arquitetura atual

O ambiente oficial deste projeto é self-hosted: Docker Compose na VPS, sem Vercel, Render, Supabase ou Upstash.

- Landing pública: Next.js
- CRM autenticado: Next.js + NextAuth
- API: Express + Prisma + Socket.IO
- Banco: PostgreSQL 16 em volume Docker
- Cache, sessões e rate limit: Redis 7 em volume Docker
- Uploads: filesystem local persistente no volume da API
- Entrada pública: Nginx

## Funcionalidades

- Leads públicos e internos com consentimento LGPD
- Agenda e disponibilidade
- Integração opcional com Google Calendar e Google Business Profile
- Disparos por e-mail SMTP e WhatsApp Business oficial
- Financeiro, dashboard, colaboradores, permissões e auditoria
- CMS da landing com histórico de versões
- Segurança, 2FA, sessões, rate limit e health checks

## Desenvolvimento e validação

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm lint
corepack pnpm test
corepack pnpm build
```

Para operação na VPS, consulte [PRODUCTION_SETUP.md](PRODUCTION_SETUP.md). Não iniciar servidores localhost para a apresentação; a stack de apresentação é a Compose remota.

## Estado da apresentação

- Landing: `http://87.76.215.134`
- CRM: `http://87.76.215.134:3001/login`
- Health: `http://87.76.215.134/health/ready`

O acesso atual é HTTP por IP. Domínio, TLS, backup externo, RLS validada e credenciais das integrações são necessários antes de uso com dados reais.
