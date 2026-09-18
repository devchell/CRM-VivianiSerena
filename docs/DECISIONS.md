# DECISIONS — VivianiCRM

> **Versão:** 2.0  
> **Data:** 2026-04-04  
> **Status:** aprovado

> **Decisão vigente — 2026-08-31:** substituir a implantação Vercel/Render/Supabase/Upstash por Docker Compose self-hosted na VPS. As decisões D1, D3, D4 e D5 abaixo permanecem como histórico de produto e não autorizam deploy cloud.

---

## 1. DECISÕES ARQUITETURAIS PRINCIPAIS

### D1: Frontend + Backend separado (não monolito)

**Decisão**: Implementar CRM e Landing como Next.js, API como Express em Render.

**Trade-offs**:
- ✅ **Vantagem**: escalabilidade independente, deploy desacoplado, cache no CDN
- ⚠️ **Custo**: complexidade de CORS, contratos de API, sincronização de tipos
- ❌ **Risco mitigado**: vendor lock-in (ambos em plataformas gerenciadas)

**Alternativa rejeitada**: Monolito único (Django/Rails)
- Motivo: acoplamento muito forte; escalabilidade uniforme; deploy tudo-ou-nada prejudicial

**Decisão vencedora por**: necessidade de escalar frontend independentemente do backend (Vercel suporta infinitos deployments paralelos)

---

### D2: Monorepo com Pnpm Workspaces

**Decisão**: Um repositório Git com `apps/` e `packages/` e build orchestrado.

**Trade-offs**:
- ✅ **Vantagem**: tipos compartilhados (evita divergência), componentes reutilizáveis, CI/CD único
- ⚠️ **Custo**: instalação de deps mais lenta, workspaces não são triviais para iniciantes
- ❌ **Risco mitigado**: regressão de tipos (compartilhamento forçado)

**Alternativa rejeitada**: Polyrepo (múltiplos repositórios)
- Motivo: duplicação de tipos, overhead de versionamento de pacotes

**Decisão vencedora por**: coerência de tipos e capacidade de refatoração atomizada

---

### D3: Supabase (PostgreSQL gerenciado)

**Decisão**: Banco de dados em Supabase com RLS integrada.

**Trade-offs**:
- ✅ **Vantagem**: gerenciado (backups, patches, alta disponibilidade), RLS nativa, PostGIS opcional
- ⚠️ **Custo**: vendor lock-in moderado (SQL é portável)
- ❌ **Risco mitigado**: não ter que gerenciar Postgres manualmente

**Alternativa rejeitada**: DynamoDB/MongoDB
- Motivo: relacionamentos complexos (leads, appointments, financials) exigem ACID; NoSQL é inadequado

**Alternativa rejeitada**: Vercel KV (Redis only)
- Motivo: não é banco de dados principal; apenas para cache/sessions

**Decisão vencedora por**: simplicidade operacional e integração RLS nativa

---

### D4: Upstash Redis para Cache e Rate Limiting

**Decisão**: Redis serverless via Upstash (não gerenciar infraestrutura).

**Trade-offs**:
- ✅ **Vantagem**: sem provisionamento, auto-scaling, muito rápido
- ⚠️ **Custo**: latência rede (NYC → Upstash), pricing por request
- ❌ **Risco mitigado**: não depender de cache local (stateless)

**Alternativa rejeitada**: Redis.cloud
- Motivo: Upstash é mais barato para workload leve e integra melhor com Render

**Alternativa rejeitada**: Memcached local
- Motivo: requer infraestrutura; não persistence

**Decisão vencedora por**: simplicidade e custo

---

### D5: Vercel para Frontend (CRM + Landing)

**Decisão**: Deploy de Next.js em Vercel (não em Render ou outro).

**Trade-offs**:
- ✅ **Vantagem**: otimização automática Next.js, Edge Functions, preview branches, DX excelente
- ⚠️ **Custo**: vendor lock-in (tight integration com Vercel)
- ❌ **Risco mitigado**: portabilidade (Next.js é apenas Node.js, roda em qualquer lugar)

**Alternativa rejeitada**: Netlify
- Motivo: Vercel é melhor para Next.js (criador oficial)

**Alternativa rejeitada**: Self-hosted (VPS)
- Motivo: overhead operacional, sem preview branches, sem auto-scaling

**Decisão vencedora por**: DX e otimização automática

---

### D6: Render para Backend (Express API)

**Decisão**: Express em Node.js deployado em Render (container).

**Trade-offs**:
- ✅ **Vantagem**: simples, robusto, community grande
- ⚠️ **Custo**: não serverless (sempre há instance rodando)
- ❌ **Risco mitigado**: suporta WebSockets e processamento longo

**Alternativa rejeitada**: Vercel Functions (Serverless)
- Motivo: timeout 60s muito curto para batch jobs; WebSocket não suportado

**Alternativa rejeitada**: Railway
- Motivo: Render tem melhor preço para sempre-on

**Decisão vencedora por**: simplicidade e suporte a WebSockets

---

### D7: NextAuth.js v5 para Autenticação

**Decisão**: NextAuth.js 5 com Supabase Auth como provider.

**Trade-offs**:
- ✅ **Vantagem**: integração perfeita com Next.js, suporta OAuth, JWT customizável
- ⚠️ **Custo**: outra dependência, traz opinião sobre estrutura
- ❌ **Risco mitigado**: não reinventar roda de auth

**Alternativa rejeitada**: Clerk
- Motivo: bom, mas overhead maior; NextAuth é mais leve

**Alternativa rejeitada**: Auth0
- Motivo: pricing alto para baixo volume

**Decisão vencedora por**: integração Next.js + custo

---

### D8: Prisma para ORM

**Decisão**: Prisma como ORM para migrations versionadas e type-safe.

**Trade-offs**:
- ✅ **Vantagem**: migrations versionadas, type-safe, CLI potente
- ⚠️ **Custo**: dependência mais pesada
- ❌ **Risco mitigado**: evitar SQL raw (risco de injection)

**Alternativa rejeitada**: TypeORM
- Motivo: Prisma é mais simples e modern

**Alternativa rejeitada**: Sequelize
- Motivo: Prisma tem melhor DX

**Decisão vencedora por**: type safety e migrations

---

### D9: Shadcn/ui para Componentes

**Decisão**: Shadcn (Radix + Tailwind) para componentes reutilizáveis.

**Trade-offs**:
- ✅ **Vantagem**: sem overhead de tema, acessibilidade nativa, customizável
- ⚠️ **Custo**: headless (mais trabalho de styling)
- ❌ **Risco mitigado**: vendor lock-in (copiar componentes, não depender de npm)

**Alternativa rejeitada**: Material-UI
- Motivo: overhead de tema, muito opiniado

**Alternativa rejeitada**: Chakra UI
- Motivo: Shadcn é mais leve

**Decisão vencedora por**: simplicidade e flexibilidade

---

### D10: Google Calendar OAuth (não Embed)

**Decisão**: OAuth real para Google Calendar (não Embedded SDK).

**Trade-offs**:
- ✅ **Vantagem**: sincronização bidirecional, revoke suportado, user controla acesso
- ⚠️ **Custo**: fluxo de OAuth obrigatório, token refresh complexo
- ❌ **Risco mitigado**: privacidade (Google vê quando Google requer, não sempre)

**Alternativa rejeitada**: iCal (import apenas)
- Motivo: unidirecional, sem sincronização live

**Decisão vencedora por**: experiência de usuário e sincronização

---

### D11: WhatsApp Business API (não Web)

**Decisão**: Meta WhatsApp Business Platform com OAuth (não WhatsApp Web).

**Trade-offs**:
- ✅ **Vantagem**: oficial, suportado, webhook inbound, sem sessão local
- ⚠️ **Custo**: setup complexo (Meta Business Account), requer aprovação
- ❌ **Risco mitigado**: conformidade legal e estabilidade

**Alternativa rejeitada**: WhatsApp Web (Whatsapp-web.js)
- Motivo: contra ToS, sessão frágil, sem suporte oficial

**Decisão vencedora por**: conformidade legal e estabilidade

---

### D12: Single-tenant (não Multi-tenant)

**Decisão**: Uma instância de banco de dados por cliente (Viviani é único).

**Trade-offs**:
- ✅ **Vantagem**: isolamento de dados, simplificado, segurança máxima
- ⚠️ **Custo**: não reutiliza infra entre clientes (SaaS)
- ❌ **Risco mitigado**: complexidade de multi-tenancy

**Alternativa rejeitada**: Multi-tenant com segregação por `tenant_id`
- Motivo: overkill para um cliente; aumenta risco de segurança (RLS complexa)

**Decisão vencedora por**: simplicidade operacional

---

### D13: RLS (Row Level Security) em Postgres

**Decisão**: Usar RLS nativa do Postgres para autorização.

**Trade-offs**:
- ✅ **Vantagem**: autorização garantida no banco (não apenas na aplicação)
- ⚠️ **Custo**: RLS pode ser complexa; requer teste cuidadoso
- ❌ **Risco mitigado**: vulnerabilidade de escalada (select * ignorando permissão)

**Alternativa rejeitada**: Autorização apenas na aplicação
- Motivo: risco muito alto; bug em código abre todos os dados

**Decisão vencedora por**: segurança

---

## 2. DECISÕES OPERACIONAIS

### D14: CI/CD via GitHub Actions

**Decisão**: Workflows YAML em `.github/workflows/` para lint, testes e deploy.

**Trade-offs**:
- ✅ **Vantagem**: integrado no GitHub, sem ferramenta externa, secret management nativo
- ⚠️ **Custo**: YAML pode ficar complexo
- ❌ **Risco mitigado**: vendor lock-in GitHub (fácil migrar para GitLab Actions)

**Alternativa rejeitada**: Jenkins/CircleCI
- Motivo: overhead para projeto pequeno

**Decisão vencedora por**: simplicidade

---

### D15: Staging em `staging` branch, Prod em `main`

**Decisão**: Git branches definem ambientes (staging → deploy homolog, main → prod).

**Trade-offs**:
- ✅ **Vantagem**: fluxo claro, rebase simples
- ⚠️ **Custo**: requer disciplina de merge
- ❌ **Risco mitigado**: deploy acidental em prod

**Alternativa rejeitada**: Feature branches sempre
- Motivo: para volume baixo, overkill

**Decisão vencedora por**: simplicidade de operação

---

### D16: Secrets em GitHub, não em .env commited

**Decisão**: Senhas, tokens, API keys em GitHub Secrets (por ambiente).

**Trade-offs**:
- ✅ **Vantagem**: nunca em git, segregados por env
- ⚠️ **Custo**: dependência de GitHub UI
- ❌ **Risco mitigado**: vazamento de secrets via git

**Alternativa rejeitada**: .env.local não versionado
- Motivo: funciona local, mas não para CI

**Decisão vencedora por**: segurança

---

### D17: Logs estruturados (JSON)

**Decisão**: Logs como JSON estruturado com timestamp, level, event, user_id.

**Trade-offs**:
- ✅ **Vantagem**: buscável, parseável, consistente
- ⚠️ **Custo**: menos human-readable que logs de texto
- ❌ **Risco mitigado**: impossível filtrar logs por structured query

**Alternativa rejeitada**: Logs de texto simples
- Motivo: impossível filtrar depois

**Decisão vencedora por**: operabilidade

---

## 3. DECISÕES DE DADOS

### D18: Soft-delete para Leads (nunca hard-delete)

**Decisão**: `deleted_at` timestamp, não remover linha do banco.

**Trade-offs**:
- ✅ **Vantagem**: auditoria permanente, recuperação possível, LGPD compliance
- ⚠️ **Custo**: queries precisam filtrar `deleted_at IS NULL`
- ❌ **Risco mitigado**: deleção acidental irreversível

**Alternativa rejeitada**: Hard-delete
- Motivo: impossível atender direito de LGPD "direito ao esquecimento" com auditoria

**Decisão vencedora por**: conformidade LGPD

---

### D19: Financeiros imutáveis (sem update após criação)

**Decisão**: Lançamentos financeiros nunca sobrescrevem a versão original. Uma correção cria um novo lançamento com os dados consolidados e arquiva o registro anterior com `deleted_at`.

**Trade-offs**:
- ✅ **Vantagem**: auditoria perfeita, impossível esconder manipulação
- ⚠️ **Custo**: a edição gera um novo identificador e exige que as consultas ignorem versões arquivadas
- ❌ **Risco mitigado**: manipulação de dados históricos

**Alternativa rejeitada**: Permitir update com versioning
- Motivo: imutabilidade é mais segura

**Decisão vencedora por**: segurança contábil

---

### D20: Versionamento de conteúdo (CMS)

**Decisão**: `contents` + `content_versions` para histórico de edições.

**Trade-offs**:
- ✅ **Vantagem**: auditoria, rollback possível, histórico editores
- ⚠️ **Custo**: mais duas tabelas, query joins
- ❌ **Risco mitigado**: perda de conteúdo anterior

**Alternativa rejeitada**: Sem versionamento
- Motivo: útil para operações

**Decisão vencedora por**: auditoria operacional

---

### D21: Consentimento em tabela separada (`consent_logs`)

**Decisão**: Logs de consentimento LGPD em tabela imutável, não como coluna em `leads`.

**Trade-offs**:
- ✅ **Vantagem**: auditoria clara de consentimento, histórico, multiple-source
- ⚠️ **Custo**: join extra para validar consentimento
- ❌ **Risco mitigado**: perda de histórico de consentimento

**Alternativa rejeitada**: Coluna `consentedAt` em leads
- Motivo: não captura múltiplos consentimentos ou revogações

**Decisão vencedora por**: auditoria LGPD

---

## 4. DECISÕES DE SEGURANÇA

### D22: JWT em Cookie HTTP-only (não localStorage)

**Decisão**: Token em cookie `httponly`, não em localStorage.

**Trade-offs**:
- ✅ **Vantagem**: proteção contra XSS (JS não acessa)
- ⚠️ **Custo**: CSRF precisa de proteção (SameSite)
- ❌ **Risco mitigado**: roubo de token via JavaScript

**Alternativa rejeitada**: localStorage (JWT exposto a XSS)
- Motivo: muito inseguro

**Decisão vencedora por**: segurança

---

### D23: 2FA obrigatório para ADMIN

**Decisão**: ADMIN **deve** ativar 2FA no primeiro login.

**Trade-offs**:
- ✅ **Vantagem**: proteção contra brute force, credential stuffing
- ⚠️ **Custo**: UX: mais passo para login
- ❌ **Risco mitigado**: acesso root comprometido

**Alternativa rejeitada**: 2FA opcional
- Motivo: admin é crítico; deve obrigatório

**Decisão vencedora por**: segurança

---

### D24: Rate Limiting por IP (não por usuário)

**Decisão**: Rate limit global: 5 login/min por IP, 10 leads/min por IP.

**Trade-offs**:
- ✅ **Vantagem**: protege contra brute force anônimo
- ⚠️ **Custo**: afeta múltiplos usuários mesma rede
- ❌ **Risco mitigado**: ataque de força bruta simples

**Alternativa rejeitada**: Rate limit por usuário
- Motivo: usuário não autenticado (brute force) não tem ID

**Decisão vencedora por**: simplicidade

---

## 5. TRADE-OFFS ACEITOS

| Trade-off | Benefício | Custo | Justificativa |
|---|---|---|---|
| Google Calendar opcional | flexibilidade | sem sync se indisponível | Fallback: agendamento local |
| Single-tenant | simplicidade, segurança | sem multi-client reuse | Viviani é único cliente |
| WebSocket apenas em Render | escalabilidade | não em Vercel Functions | API robusta, necessária |
| RLS complexa | segurança garantida no banco | queries mais lentas | Segurança > performance |
| Imutabilidade de financeiros | auditoria perfeita | UX: não edita direto | Criticidade financeira |

---

## 6. CHANGELOG

| Data | Versão | Decisão | Autor |
|---|---|---|---|
| 2026-03-20 | 1.0 | Primeiras 10 decisões arquiteturais | Claude |
| 2026-04-04 | 2.0 | Adicionadas decisões operacionais, segurança, dados | Claude |
